import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  asMetadataRecord,
  calcularTotalNominal,
  criarItensCobranca,
  numeroSeguro,
  type BoletoCompositionValues,
} from "@/lib/financeiro/boleto-composicao";
import { calcularCondominioDaCobranca } from "./condominio";
import { calcularIptuDaCobranca } from "./iptu";
import {
  calcularInicioCompetencia,
  criarDataVencimento,
  resolverVigenciaCobrancaMensal,
} from "./financeiro";
import { normalizarDataUTC } from "./periodos";
import { resolverDespesasResidencial } from "@/lib/residenciais/cobranca";

type LegacyPeriodForEmission = {
  id: string;
  dataInicio: Date;
  dataFim: Date;
  valorAluguel: number;
  hasCondominio: boolean;
  valorCondominio: number | null;
  hasIPTU: boolean;
  valorIPTU: number | null;
  descontoPontualidade: number | null;
  tipoDesconto: string | null;
  diasAntecedenciaDesc: number | null;
  multaAtrasoPercentual: number | null;
  jurosAtrasoPercentual: number | null;
  diaVencimento: number | null;
};

function competenciaDaCobranca(metadata: unknown, dataVencimento: Date) {
  const value = asMetadataRecord(metadata).competence;
  if (typeof value === "string" && /^\d{4}-\d{2}$/.test(value)) return value;
  return `${dataVencimento.getUTCFullYear()}-${String(dataVencimento.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function resolverPeriodoLegadoAntesDaEmissao<T extends {
  dataInicio: Date;
  dataFim: Date;
}>(periodos: T[], metadata: unknown, dataVencimento: Date) {
  const competencia = competenciaDaCobranca(metadata, dataVencimento);
  const referencia = calcularInicioCompetencia(competencia);
  return periodos.find(periodo => (
    referencia >= normalizarDataUTC(periodo.dataInicio)
    && referencia <= normalizarDataUTC(periodo.dataFim)
  )) ?? null;
}

export function composicaoFoiEditadaManualmente(metadata: unknown) {
  return typeof asMetadataRecord(metadata).compositionEditedAt === "string";
}

/**
 * Atualiza um rascunho legado com a vigência efetiva imediatamente antes da
 * emissão. O periodId antigo é deliberadamente ignorado: a competência é a
 * fonte de verdade quando o usuário acabou de reajustar o contrato.
 */
export async function reconciliarCobrancaLegadaAntesDaEmissao(transacaoId: string) {
  const transaction = await prisma.transacaoFinanceira.findUnique({
    where: { id: transacaoId },
    include: {
      contrato: {
        include: {
          imovelLocacao: {
            include: { periodos: { orderBy: { dataInicio: "asc" } } },
          },
        },
      },
    },
  });

  if (
    !transaction
    || transaction.categoria !== "ALUGUEL"
    || transaction.tipo !== "RECEITA"
    || transaction.status !== "PENDENTE"
    || transaction.leaseId
    || !transaction.contrato?.imovelLocacao
    || transaction.interCodigoSolicitacao
    || transaction.interNossoNumero
    || transaction.interTxId
    || transaction.interBarcode
    || composicaoFoiEditadaManualmente(transaction.metadata)
  ) {
    return { updated: false as const };
  }

  const locacao = transaction.contrato.imovelLocacao;
  const period = resolverPeriodoLegadoAntesDaEmissao(
    locacao.periodos,
    transaction.metadata,
    transaction.dataVencimento,
  ) as LegacyPeriodForEmission | null;
  if (!period) {
    return {
      updated: false as const,
      error: "A competência da cobrança não está coberta por uma vigência do contrato.",
    };
  }

  const metadataAtual = asMetadataRecord(transaction.metadata);
  const competence = competenciaDaCobranca(transaction.metadata, transaction.dataVencimento);
  const [year, month] = competence.split("-").map(Number);
  const dueDay = period.diaVencimento
    ?? locacao.diaVencimento
    ?? transaction.dataVencimento.getUTCDate();
  const dueDate = criarDataVencimento(year, month, dueDay);
  const residentialExpenses = Array.isArray(metadataAtual.residentialExpenses)
    ? metadataAtual.residentialExpenses.flatMap(item => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const record = item as Record<string, unknown>;
        const amount = numeroSeguro(record.amount);
        if (amount <= 0) return [];
        return [{
          id: typeof record.id === "string" ? record.id : undefined,
          description: typeof record.description === "string" ? record.description : "Despesa residencial",
          amount,
          category: typeof record.category === "string" ? record.category : undefined,
        }];
      })
    : [];
  const values: BoletoCompositionValues = {
    rentValue: period.valorAluguel,
    condominiumValue: period.hasCondominio ? numeroSeguro(period.valorCondominio) : 0,
    iptuValue: period.hasIPTU ? numeroSeguro(period.valorIPTU) : 0,
    waterValue: numeroSeguro(metadataAtual.waterValue),
    electricityValue: numeroSeguro(metadataAtual.electricityValue),
    gasValue: numeroSeguro(metadataAtual.gasValue),
    otherValue: numeroSeguro(metadataAtual.otherValue),
    otherDescription: typeof metadataAtual.otherDescription === "string"
      ? metadataAtual.otherDescription
      : undefined,
    residentialExpenses,
  };
  const billingConditions = {
    discountValue: numeroSeguro(period.descontoPontualidade ?? locacao.descontoPontualidade),
    discountType: period.tipoDesconto ?? locacao.tipoDesconto ?? "VALOR",
    discountDaysBefore: period.diasAntecedenciaDesc ?? locacao.diasAntecedenciaDesc ?? 0,
    lateFeePercentage: numeroSeguro(period.multaAtrasoPercentual ?? locacao.multaAtrasoPercentual),
    lateInterestMonthly: numeroSeguro(period.jurosAtrasoPercentual ?? locacao.jurosAtrasoPercentual),
  };
  const total = calcularTotalNominal(values);
  const metadata = {
    ...metadataAtual,
    competence,
    periodId: period.id,
    rentValue: values.rentValue,
    condominiumValue: values.condominiumValue,
    iptuValue: values.iptuValue,
    dueDay,
    billingConditions,
    source: "PERIODO_CONTRATUAL",
    preEmissionSyncedAt: new Date().toISOString(),
  };
  const items = criarItensCobranca(values, billingConditions);

  await prisma.$transaction(async tx => {
    await tx.transacaoFinanceira.update({
      where: { id: transaction.id },
      data: {
        valor: total,
        dataVencimento: dueDate,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
    await tx.boletoChargeItem.deleteMany({ where: { transacaoId: transaction.id } });
    if (items.length > 0) {
      await tx.boletoChargeItem.createMany({
        data: items.map(item => ({
          transacaoId: transaction.id,
          type: item.type,
          description: item.description,
          amount: item.amount,
          order: item.order,
        })),
      });
    }
  });

  return { updated: true as const, rentValue: values.rentValue, total, dueDate };
}

/**
 * Atualiza um rascunho do fluxo novo usando a vigência válida no ciclo da
 * cobrança. Boletos emitidos, cobranças pagas e composições editadas pelo
 * usuário nunca são alterados por esta reconciliação.
 */
export async function reconciliarCobrancaCanonicaAntesDaEmissao(transacaoId: string) {
  const transaction = await prisma.transacaoFinanceira.findUnique({
    where: { id: transacaoId },
    include: {
      lease: {
        include: {
          terms: true,
          termsPeriods: { orderBy: { effectiveFrom: "asc" } },
          iptu: true,
          condominium: true,
          utilities: true,
          property: { include: { residencial: { include: { despesas: true } } } },
        },
      },
    },
  });

  if (!transaction?.lease) return { handled: false as const, updated: false as const };
  if (
    transaction.categoria !== "ALUGUEL"
    || transaction.tipo !== "RECEITA"
    || transaction.status !== "PENDENTE"
    || transaction.lease.status !== "ACTIVE"
    || transaction.interCodigoSolicitacao
    || transaction.interNossoNumero
    || transaction.interTxId
    || transaction.interBarcode
    || composicaoFoiEditadaManualmente(transaction.metadata)
  ) {
    return { handled: true as const, updated: false as const };
  }

  const lease = transaction.lease;
  if (lease.termsPeriods.length === 0) {
    return { handled: true as const, updated: false as const, error: "O contrato não possui vigência financeira cadastrada." };
  }

  const dueDateAtual = normalizarDataUTC(transaction.dataVencimento);
  const vigencia = resolverVigenciaCobrancaMensal({
    periodos: lease.termsPeriods,
    ano: dueDateAtual.getUTCFullYear(),
    mes: dueDateAtual.getUTCMonth() + 1,
    diaVencimentoPadrao: lease.terms?.paymentDueDay ?? dueDateAtual.getUTCDate(),
    primeiroVencimento: lease.terms?.firstPeriodDueDate,
    fimPeriodo: lease.terms?.firstPeriodEndDay,
  });
  if (!vigencia?.periodo) {
    return { handled: true as const, updated: false as const, error: "A cobrança não está coberta por uma vigência financeira do contrato." };
  }
  const period = vigencia.periodo;
  if (period.reviewStatus !== "REVIEWED") {
    return { handled: true as const, updated: false as const, error: `A vigência da competência ${vigencia.competencia} ainda não foi conferida.` };
  }

  const iptu = calcularIptuDaCobranca(lease.iptu, vigencia.dataVencimento, {
    legacySystem: lease.legacySystem,
  });
  const condominiumValue = calcularCondominioDaCobranca(lease.condominium);
  const waterValue = Number(lease.utilities.find(item => item.type === "WATER")?.amount ?? 0);
  const electricityValue = Number(lease.utilities.find(item => item.type === "ELECTRICITY")?.amount ?? 0);
  const leaseGasValue = Number(lease.utilities.find(item => item.type === "GAS")?.amount ?? 0);
  const despesas = resolverDespesasResidencial(
    lease.property?.residencial?.despesas,
    vigencia.dataVencimento,
    leaseGasValue,
  );
  const metadataAtual = asMetadataRecord(transaction.metadata);
  const values: BoletoCompositionValues = {
    rentValue: Number(period.rentAmount),
    condominiumValue,
    iptuValue: iptu.valor,
    waterValue,
    electricityValue,
    gasValue: despesas.gasValue,
    otherValue: numeroSeguro(metadataAtual.otherValue),
    otherDescription: typeof metadataAtual.otherDescription === "string" ? metadataAtual.otherDescription : undefined,
    residentialExpenses: despesas.residentialExpenses,
  };
  const billingConditions = {
    discountValue: Number(period.earlyPaymentDiscount ?? lease.terms?.earlyPaymentDiscount ?? 0),
    discountType: period.discountType ?? lease.terms?.discountType ?? "FIXED",
    discountDaysBefore: period.discountDaysBefore ?? lease.terms?.discountDaysBefore ?? 0,
    lateFeePercentage: Number(period.lateFeePercentage ?? lease.terms?.lateFeePercentage ?? 0),
    lateInterestMonthly: Number(period.lateInterestMonthly ?? lease.terms?.lateInterestMonthly ?? 0),
  };
  const total = calcularTotalNominal(values);
  const metadata = {
    ...metadataAtual,
    competence: vigencia.competencia,
    leaseId: lease.id,
    termsPeriodId: period.id,
    rentValue: values.rentValue,
    condominiumValue,
    iptuValue: iptu.valor,
    waterValue,
    electricityValue,
    gasValue: despesas.gasValue,
    residentialExpenses: despesas.residentialExpenses,
    residentialGasOverridden: despesas.gasOverridden,
    iptuInstallment: iptu.numeroParcela,
    iptuInstallments: iptu.quantidadeParcelas,
    billingConditions,
    dueDay: period.paymentDueDay,
    source: "LEASE_TERMS_PERIOD",
    preEmissionSyncedAt: new Date().toISOString(),
  };
  const items = criarItensCobranca(values, billingConditions);

  await prisma.$transaction(async tx => {
    await tx.transacaoFinanceira.update({
      where: { id: transaction.id },
      data: {
        valor: total,
        dataVencimento: vigencia.dataVencimento,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
    await tx.boletoChargeItem.deleteMany({ where: { transacaoId: transaction.id } });
    if (items.length > 0) {
      await tx.boletoChargeItem.createMany({
        data: items.map(item => ({
          transacaoId: transaction.id,
          type: item.type,
          description: item.description,
          amount: item.amount,
          order: item.order,
        })),
      });
    }
    await tx.leaseCharge.updateMany({
      where: {
        leaseId: lease.id,
        competence: competenciaDaCobranca(transaction.metadata, transaction.dataVencimento),
        chargeType: "RENT",
        status: "PENDING",
      },
      data: {
        termsPeriodId: period.id,
        competence: vigencia.competencia,
        amount: total,
        dueDate: vigencia.dataVencimento,
        calculationData: metadata as Prisma.InputJsonValue,
      },
    });
  });

  return { handled: true as const, updated: true as const, rentValue: values.rentValue, total, dueDate: vigencia.dataVencimento };
}

export async function reconciliarCobrancaAntesDaEmissao(transacaoId: string) {
  const canonical = await reconciliarCobrancaCanonicaAntesDaEmissao(transacaoId);
  if (canonical.handled) return canonical;
  return reconciliarCobrancaLegadaAntesDaEmissao(transacaoId);
}
