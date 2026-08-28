import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  asMetadataRecord,
  calcularTotalNominal,
  criarItensCobranca,
  numeroSeguro,
  type BoletoCompositionValues,
} from "@/lib/financeiro/boleto-composicao";
import { calcularInicioCompetencia, criarDataVencimento } from "./financeiro";
import { normalizarDataUTC } from "./periodos";

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
