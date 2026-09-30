import { normalizarDataUTC } from "./periodos";
import { calcularInicioCompetencia, resolverUltimasCondicoesFinanceiras } from "./financeiro";

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
    dataReferencia = calcularInicioCompetencia(meta.competence);
  }

  return resolverUltimasCondicoesFinanceiras(
    periodos.map(periodo => ({ ...periodo, effectiveFrom: periodo.dataInicio })), dataReferencia,
  );
}
