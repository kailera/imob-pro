import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  CategoriaTransacao,
  StatusTransacao,
  TipoTransacao,
  type Prisma,
} from '@/generated/prisma';
import { requireUserContext } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireUserContext();
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get('tipo');
    const categoria = searchParams.get('categoria');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const dateField = searchParams.get('dateField') || 'vencimento';
    const search = searchParams.get('search');
    const nome = searchParams.get('nome')?.trim();
    const cpf = searchParams.get('cpf')?.trim();
    const page = searchParams.get('page');
    const limit = searchParams.get('limit') || '10';

    const where: Prisma.TransacaoFinanceiraWhereInput = {
      AND: [{
        OR: [
          { contrato: { imobId: tenantId } },
          { lease: { tenantId } },
          { imovel: { imobId: tenantId } },
          { metadata: { path: ['imobId'], equals: tenantId } },
        ],
      }],
    };
    const searchTerm = search?.trim();
    const searchDocumentDigits = searchTerm?.replace(/\D/g, '') || '';
    const searchDocumentVariants = new Set(
      [
        searchTerm,
        searchDocumentDigits,
        searchDocumentDigits.length === 11
          ? searchDocumentDigits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
          : '',
        searchDocumentDigits.length === 14
          ? searchDocumentDigits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
          : '',
      ].filter((value): value is string => Boolean(value))
    );

    if (tipo && Object.values(TipoTransacao).includes(tipo as TipoTransacao)) {
      where.tipo = tipo as TipoTransacao;
    }
    if (categoria && Object.values(CategoriaTransacao).includes(categoria as CategoriaTransacao)) {
      where.categoria = categoria as CategoriaTransacao;
    }
    // A busca do sacado deve localizar todas as cobranças correspondentes,
    // sem restringir o resultado por situação ou período.
    if (!searchTerm && status && status !== 'Todas') {
      // Map situations from page view if needed, or query directly
      if (status === 'Pendente') {
        where.status = 'PENDENTE';
      } else if (status === 'Liquidado') {
        where.status = 'LIQUIDADO';
      } else if (status === 'Cancelado') {
        where.status = 'CANCELADO';
      } else if (Object.values(StatusTransacao).includes(status as StatusTransacao)) {
        where.status = status as StatusTransacao;
      }
    }

    if (searchTerm) {
      const documentSearch: Prisma.LocatarioWhereInput[] = Array.from(searchDocumentVariants).map((document) => ({
        cpfCnpj: { contains: document, mode: 'insensitive' },
      }));

      where.OR = [
        { descricao: { contains: searchTerm, mode: 'insensitive' } },
        {
          contrato: {
            is: {
              locatarios: {
                some: {
                  OR: [
                    { nome: { contains: searchTerm, mode: 'insensitive' } },
                    ...documentSearch,
                  ],
                },
              },
            },
          },
        },
      ];
    }

    const locatarioFilters: Prisma.LocatarioWhereInput[] = [];
    if (nome) {
      locatarioFilters.push({ nome: { contains: nome, mode: 'insensitive' } });
    }
    if (cpf) {
      const cpfDigits = cpf.replace(/\D/g, '');
      const cpfVariants = new Set(
        [
          cpf,
          cpfDigits,
          cpfDigits.length === 11
            ? cpfDigits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
            : '',
          cpfDigits.length === 14
            ? cpfDigits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
            : '',
        ].filter(Boolean)
      );

      locatarioFilters.push({
        OR: Array.from(cpfVariants).map((document) => ({
          cpfCnpj: { contains: document, mode: 'insensitive' },
        })),
      });
    }

    if (locatarioFilters.length > 0) {
      where.contrato = {
        is: {
          locatarios: {
            some: { AND: locatarioFilters },
          },
        },
      };
    }

    const fieldMap: Record<string, string> = {
      vencimento: 'dataVencimento',
      movimento: 'updatedAt',
      recepcao: 'createdAt',
      pagamento: 'dataPagamento',
    };
    const dbField = fieldMap[dateField] || 'dataVencimento';

    if (!searchTerm && (startDate || endDate)) {
      const dateRange: Prisma.DateTimeFilter = {};
      if (startDate) dateRange.gte = new Date(startDate);
      if (endDate) dateRange.lte = new Date(endDate);

      if (dbField === 'updatedAt') where.updatedAt = dateRange;
      else if (dbField === 'createdAt') where.createdAt = dateRange;
      else if (dbField === 'dataPagamento') {
        where.OR = [
          { dataPagamento: dateRange },
          { interDataRecebimento: dateRange },
        ];
      }
      else where.dataVencimento = dateRange;
    }

    if (page) {
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const [transacoes, total, statusGroup] = await Promise.all([
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
                  select: { nome: true, telefone: true, cpfCnpj: true }
                }
              }
            }
          }
        }),
        prisma.transacaoFinanceira.count({ where }),
        prisma.transacaoFinanceira.groupBy({
          by: ['status'],
          where,
          _sum: {
            valor: true
          }
        })
      ]);

      const totalsByStatus = {
        registrado: 0,
        liquidado: 0,
        baixado: 0,
        recepcionado: 0,
        cancelado: 0
      };

      let totalValor = 0;
      for (const group of statusGroup) {
        const sumVal = group._sum.valor || 0;
        totalValor += sumVal;
        
        if (group.status === 'LIQUIDADO') {
          totalsByStatus.liquidado = sumVal;
        } else if (group.status === 'CANCELADO') {
          totalsByStatus.cancelado = sumVal;
        } else if (group.status === 'PENDENTE') {
          totalsByStatus.recepcionado = sumVal;
        }
      }
      totalsByStatus.registrado = totalValor;

      console.log("[transacoes-api] where:", JSON.stringify(where));
      console.log("[transacoes-api] statusGroup:", JSON.stringify(statusGroup));
      console.log("[transacoes-api] totalsByStatus:", JSON.stringify(totalsByStatus));

      return NextResponse.json({
        data: transacoes,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totals: totalsByStatus
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
              select: { nome: true, telefone: true, cpfCnpj: true }
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
