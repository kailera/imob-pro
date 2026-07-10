import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { movimentacaoId, transacaoId } = body;

    if (!movimentacaoId || !transacaoId) {
      return NextResponse.json({ error: 'movimentacaoId e transacaoId são obrigatórios.' }, { status: 400 });
    }

    // Executar a conciliação de forma atômica
    const result = await prisma.$transaction(async (tx) => {
      const movimentacao = await tx.movimentacaoBancaria.findUnique({
        where: { id: movimentacaoId }
      });

      if (!movimentacao) {
        throw new Error('Movimentação bancária não encontrada.');
      }

      if (movimentacao.status === 'CONCILIADO') {
        throw new Error('Esta movimentação bancária já está conciliada.');
      }

      const transacao = await tx.transacaoFinanceira.findUnique({
        where: { id: transacaoId }
      });

      if (!transacao) {
        throw new Error('Transação financeira não encontrada.');
      }

      // 1. Atualiza a transação financeira
      const updatedTransacao = await tx.transacaoFinanceira.update({
        where: { id: transacaoId },
        data: {
          status: 'LIQUIDADO',
          dataPagamento: movimentacao.data
        }
      });

      // 2. Vincula e concilia a movimentação bancária
      const updatedMovimentacao = await tx.movimentacaoBancaria.update({
        where: { id: movimentacaoId },
        data: {
          status: 'CONCILIADO',
          transacaoId: transacaoId
        }
      });

      return { updatedTransacao, updatedMovimentacao };
    });

    return NextResponse.json({
      message: 'Conciliação efetuada com sucesso.',
      ...result
    });
  } catch (err: any) {
    console.error('[match-post] Erro:', err);
    return NextResponse.json({ error: err.message || 'Erro ao conciliar transações.' }, { status: 500 });
  }
}
