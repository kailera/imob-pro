import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const usuarioId = searchParams.get('usuarioId');

    const where: any = {};
    if (status) where.status = status;
    if (usuarioId) where.usuarioId = usuarioId;

    const comissoes = await prisma.comissao.findMany({
      where,
      orderBy: { dataVencimento: 'desc' },
      include: {
        usuario: {
          select: { id: true, email: true, firstName: true, lastName: true }
        },
        transacao: true
      }
    });

    return NextResponse.json(comissoes);
  } catch (err) {
    console.error('[comissoes-get] Erro:', err);
    return NextResponse.json({ error: 'Erro ao listar comissões.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      usuarioId,
      valorBrutoNegocio,
      percentual,
      valorComissao,
      tipoNegocio,
      referenciaId,
      dataVencimento,
      status
    } = body;

    if (!usuarioId || valorBrutoNegocio === undefined || percentual === undefined || valorComissao === undefined || !tipoNegocio || !dataVencimento) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    const comissao = await prisma.comissao.create({
      data: {
        usuarioId,
        valorBrutoNegocio: parseFloat(valorBrutoNegocio),
        percentual: parseFloat(percentual),
        valorComissao: parseFloat(valorComissao),
        tipoNegocio,
        referenciaId: referenciaId || null,
        dataVencimento: new Date(dataVencimento),
        status: status || 'PENDENTE'
      }
    });

    return NextResponse.json(comissao, { status: 201 });
  } catch (err) {
    console.error('[comissoes-post] Erro:', err);
    return NextResponse.json({ error: 'Erro ao cadastrar comissão.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, dataPagamento } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID e status são obrigatórios.' }, { status: 400 });
    }

    const comissaoExistente = await prisma.comissao.findUnique({
      where: { id },
      include: { usuario: true }
    });

    if (!comissaoExistente) {
      return NextResponse.json({ error: 'Comissão não encontrada.' }, { status: 404 });
    }

    const updatedData: any = { status };
    if (status === 'PAGO') {
      const dataPgto = dataPagamento ? new Date(dataPagamento) : new Date();
      updatedData.dataPagamento = dataPgto;

      // Se não houver transação associada, cria uma despesa no financeiro
      if (!comissaoExistente.transacaoId) {
        const transacao = await prisma.transacaoFinanceira.create({
          data: {
            descricao: `Pagamento de comissão a ${comissaoExistente.usuario.firstName} ${comissaoExistente.usuario.lastName} - Ref: ${comissaoExistente.tipoNegocio}`,
            valor: comissaoExistente.valorComissao,
            tipo: 'DESPESA',
            categoria: 'COMISSAO',
            status: 'LIQUIDADO',
            dataVencimento: comissaoExistente.dataVencimento,
            dataPagamento: dataPgto,
            usuarioId: comissaoExistente.usuarioId
          }
        });
        updatedData.transacaoId = transacao.id;
      }
    }

    const comissao = await prisma.comissao.update({
      where: { id },
      data: updatedData,
      include: { usuario: true, transacao: true }
    });

    return NextResponse.json(comissao);
  } catch (err) {
    console.error('[comissoes-patch] Erro:', err);
    return NextResponse.json({ error: 'Erro ao atualizar comissão.' }, { status: 500 });
  }
}
