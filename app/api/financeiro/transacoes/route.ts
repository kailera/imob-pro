import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get('tipo');
    const categoria = searchParams.get('categoria');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    if (tipo) where.tipo = tipo;
    if (categoria) where.categoria = categoria;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.dataVencimento = {};
      if (startDate) where.dataVencimento.gte = new Date(startDate);
      if (endDate) where.dataVencimento.lte = new Date(endDate);
    }

    const transacoes = await prisma.transacaoFinanceira.findMany({
      where,
      orderBy: { dataVencimento: 'desc' },
      include: {
        imovel: {
          select: { id: true, codigo: true, titulo: true }
        },
        usuario: {
          select: { id: true, email: true, firstName: true, lastName: true }
        }
      }
    });

    return NextResponse.json(transacoes);
  } catch (err) {
    console.error('[transacoes-get] Erro:', err);
    return NextResponse.json({ error: 'Erro ao listar transações financeiras.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      descricao,
      valor,
      tipo,
      categoria,
      status,
      dataVencimento,
      dataPagamento,
      imovelId,
      usuarioId
    } = body;

    if (!descricao || valor === undefined || !tipo || !categoria || !dataVencimento) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    const transacao = await prisma.transacaoFinanceira.create({
      data: {
        descricao,
        valor: parseFloat(valor),
        tipo,
        categoria,
        status: status || 'PENDENTE',
        dataVencimento: new Date(dataVencimento),
        dataPagamento: dataPagamento ? new Date(dataPagamento) : null,
        imovelId: imovelId || null,
        usuarioId: usuarioId || null
      }
    });

    return NextResponse.json(transacao, { status: 201 });
  } catch (err) {
    console.error('[transacoes-post] Erro:', err);
    return NextResponse.json({ error: 'Erro ao criar transação financeira.' }, { status: 500 });
  }
}
