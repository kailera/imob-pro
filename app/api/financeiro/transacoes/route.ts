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
    const dateField = searchParams.get('dateField') || 'vencimento';
    const search = searchParams.get('search');
    const page = searchParams.get('page');
    const limit = searchParams.get('limit') || '10';

    const where: any = {};

    if (tipo) where.tipo = tipo;
    if (categoria) where.categoria = categoria;
    if (status) {
      // Map situations from page view if needed, or query directly
      if (status === 'Pendente') {
        where.status = 'PENDENTE';
      } else if (status === 'Liquidado') {
        where.status = 'LIQUIDADO';
      } else if (status === 'Cancelado') {
        where.status = 'CANCELADO';
      } else {
        where.status = status;
      }
    }

    if (search) {
      where.descricao = {
        contains: search,
        mode: 'insensitive'
      };
    }

    const fieldMap: Record<string, string> = {
      vencimento: 'dataVencimento',
      movimento: 'updatedAt',
      recepcao: 'createdAt',
      pagamento: 'dataPagamento',
    };
    const dbField = fieldMap[dateField] || 'dataVencimento';

    if (startDate || endDate) {
      where[dbField] = {};
      if (startDate) where[dbField].gte = new Date(startDate);
      if (endDate) where[dbField].lte = new Date(endDate);
    }

    if (page) {
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const [transacoes, total] = await Promise.all([
        prisma.transacaoFinanceira.findMany({
          where,
          orderBy: { dataVencimento: 'desc' },
          skip,
          take: limitNum,
          include: {
            imovel: {
              select: { id: true, codigo: true, titulo: true }
            },
            usuario: {
              select: { id: true, email: true, firstName: true, lastName: true }
            },
            contrato: {
              include: {
                locatarios: {
                  select: { telefone: true }
                }
              }
            }
          }
        }),
        prisma.transacaoFinanceira.count({ where })
      ]);

      return NextResponse.json({
        data: transacoes,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      });
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
        },
        contrato: {
          include: {
            locatarios: {
              select: { telefone: true }
            }
          }
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
