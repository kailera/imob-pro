import { normalizarDataUTC } from "./periodos";

export interface PeriodoCobranca {
  id: string;
  dataInicio: string | Date;
  dataFim: string | Date;
}

export function resolverPeriodoDaCobranca<T extends PeriodoCobranca>(
  periodos: T[],
  metadata: unknown,
  dataVencimento: string | Date,
): T | null {
  const meta = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : {};

  if (typeof meta.periodId === "string") {
    const periodoRegistrado = periodos.find((periodo) => periodo.id === meta.periodId);
    if (periodoRegistrado) return periodoRegistrado;
  }

  let dataReferencia = normalizarDataUTC(dataVencimento);
  if (typeof meta.competence === "string" && /^\d{4}-\d{2}$/.test(meta.competence)) {
    const [ano, mes] = meta.competence.split("-").map(Number);
    dataReferencia = new Date(Date.UTC(ano, mes - 1, 15));
  }

  return periodos.find((periodo) => {
    const inicio = normalizarDataUTC(periodo.dataInicio);
    const fim = normalizarDataUTC(periodo.dataFim);
    return dataReferencia >= inicio && dataReferencia <= fim;
  }) ?? null;
}
