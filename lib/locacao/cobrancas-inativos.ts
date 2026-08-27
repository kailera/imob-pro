import type { Prisma } from '@/generated/prisma'

type TransactionClient = Prisma.TransactionClient

export function inicioProximoMesNoBrasil(referenceDate = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(referenceDate)
  const year = Number(parts.find(part => part.type === 'year')?.value)
  const month = Number(parts.find(part => part.type === 'month')?.value)
  return new Date(Date.UTC(year, month, 1))
}

export async function removerRascunhosFuturosDeContratoInativo(
  tx: TransactionClient,
  leaseId: string,
  referenceDate = new Date(),
) {
  const cutoff = inicioProximoMesNoBrasil(referenceDate)

  const transactions = await tx.transacaoFinanceira.deleteMany({
    where: {
      leaseId,
      categoria: 'ALUGUEL',
      tipo: 'RECEITA',
      status: 'PENDENTE',
      dataVencimento: { gte: cutoff },
      interNossoNumero: null,
      interCodigoSolicitacao: null,
      interSeuNumero: null,
      interTxId: null,
      interBarcode: null,
      interPixCode: null,
      interPdfKey: null,
      interStatus: null,
    },
  })
  const leaseCharges = await tx.leaseCharge.deleteMany({
    where: {
      leaseId,
      chargeType: 'RENT',
      status: 'PENDING',
      dueDate: { gte: cutoff },
    },
  })

  return {
    transactionsRemoved: transactions.count,
    leaseChargesRemoved: leaseCharges.count,
  }
}
