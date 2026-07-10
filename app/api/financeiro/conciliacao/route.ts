import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // PENDENTE, CONCILIADO

    const where: any = {};
    if (status) where.status = status;

    const movimentacoes = await prisma.movimentacaoBancaria.findMany({
      where,
      orderBy: { data: 'desc' },
      include: {
        transacao: true
      }
    });

    return NextResponse.json(movimentacoes);
  } catch (err) {
    console.error('[conciliacao-get] Erro:', err);
    return NextResponse.json({ error: 'Erro ao listar movimentações bancárias.' }, { status: 500 });
  }
}
