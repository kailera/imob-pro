import type { Prisma } from "@/generated/prisma";
import { calcularInicioCompetencia } from "./financeiro";

type DbClient = Prisma.TransactionClient;

export interface PeriodoParaCobranca {
  id: string;
  dataInicio: Date;
  dataFim: Date;
  valorAluguel: number;
  hasCondominio: boolean;
  valorCondominio: number | null;
  hasIPTU: boolean;
  valorIPTU: number | null;
  diaVencimento: number | null;
}

export function calcularComposicaoPeriodo(periodo: PeriodoParaCobranca) {
  const aluguel = periodo.valorAluguel;
  const condominio = periodo.hasCondominio ? periodo.valorCondominio || 0 : 0;
  const iptu = periodo.hasIPTU ? periodo.valorIPTU || 0 : 0;

  return {
    aluguel,
    condominio,
    iptu,
    total: Number((aluguel + condominio + iptu).toFixed(2)),
  };
}

export function cobrancaPodeSerSincronizada(cobranca: {
  status: string;
  metadata: unknown;
  interNossoNumero: string | null;
  interCodigoSolicitacao: string | null;
  interTxId: string | null;
  interBarcode: string | null;
}) {
  const metadata = (
    cobranca.metadata && typeof cobranca.metadata === "object" && !Array.isArray(cobranca.metadata)
      ? cobranca.metadata
      : {}
  ) as Record<string, unknown>;
  const criadaPeloGeradorMensal = typeof metadata.competence === "string"
    && !metadata.fonte
    && !metadata.situacaoOriginal;

  return criadaPeloGeradorMensal
    && cobranca.status === "PENDENTE"
    && !cobranca.interNossoNumero
    && !cobranca.interCodigoSolicitacao
    && !cobranca.interTxId
    && !cobranca.interBarcode;
}

export async function sincronizarCobrancasPendentesDoPeriodo(
  db: DbClient,
  input: {
    contratoIds: string[];
    periodo: PeriodoParaCobranca;
  },
) {
  if (input.contratoIds.length === 0) return { atualizadas: 0 };

  const inicioBusca = new Date(Date.UTC(
    input.periodo.dataInicio.getUTCFullYear(),
    input.periodo.dataInicio.getUTCMonth(),
    1,
  ));
  const fimBusca = new Date(Date.UTC(
    input.periodo.dataFim.getUTCFullYear(),
    input.periodo.dataFim.getUTCMonth() + 1,
    0,
  ));
  const cobrancas = await db.transacaoFinanceira.findMany({
    where: {
      contratoId: { in: input.contratoIds },
      categoria: "ALUGUEL",
      tipo: "RECEITA",
      dataVencimento: {
        gte: inicioBusca,
        lte: fimBusca,
      },
    },
  });
  const composicao = calcularComposicaoPeriodo(input.periodo);
  let atualizadas = 0;

  for (const cobranca of cobrancas) {
    if (!cobrancaPodeSerSincronizada(cobranca)) continue;
    const metadataAtual = (
      cobranca.metadata && typeof cobranca.metadata === "object" && !Array.isArray(cobranca.metadata)
        ? cobranca.metadata
        : {}
    ) as Record<string, unknown>;
    const competencia = typeof metadataAtual.competence === "string"
      ? metadataAtual.competence
      : cobranca.dataVencimento.toISOString().slice(0, 7);
    const referenciaCompetencia = /^\d{4}-\d{2}$/.test(competencia)
      ? calcularInicioCompetencia(competencia)
      : cobranca.dataVencimento;
    if (
      referenciaCompetencia < input.periodo.dataInicio
      || referenciaCompetencia > input.periodo.dataFim
    ) {
      continue;
    }
    const metadata = {
      ...metadataAtual,
      competence: competencia,
      rentValue: composicao.aluguel,
      condominiumValue: composicao.condominio,
      iptuValue: composicao.iptu,
      dueDay: input.periodo.diaVencimento ?? cobranca.dataVencimento.getUTCDate(),
      periodId: input.periodo.id,
      source: "PERIODO_CONTRATUAL",
      periodSyncedAt: new Date().toISOString(),
    };
    const valorDivergente = Math.abs(cobranca.valor - composicao.total) > 0.001;
    const periodoDivergente = metadataAtual.periodId !== input.periodo.id;
    const aluguelDivergente = Number(metadataAtual.rentValue) !== composicao.aluguel;
    if (!valorDivergente && !periodoDivergente && !aluguelDivergente) continue;

    await db.transacaoFinanceira.update({
      where: { id: cobranca.id },
      data: {
        valor: composicao.total,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
    atualizadas += 1;
  }

  return { atualizadas };
}
