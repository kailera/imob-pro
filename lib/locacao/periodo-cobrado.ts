export type PeriodoCobrado = { startDate: string; endDate: string };

function dataValida(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function lerPeriodoCobrado(value: unknown): PeriodoCobrado | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const period = value as Record<string, unknown>;
  if (!dataValida(period.startDate) || !dataValida(period.endDate)
    || period.startDate > period.endDate) return null;
  return { startDate: period.startDate, endDate: period.endDate };
}

/** Datas de serviço inclusivas. O vencimento é apenas o prazo de pagamento. */
export function periodoCobradoDentroDaVigencia(input: {
  periodo: unknown;
  inicioContrato: Date | null | undefined;
  fimContrato: Date | null | undefined;
  vencimento: Date;
}) {
  const period = lerPeriodoCobrado(input.periodo);
  if (!period || !input.inicioContrato || !input.fimContrato) return false;
  const inicio = input.inicioContrato.toISOString().slice(0, 10);
  const fim = input.fimContrato.toISOString().slice(0, 10);
  return period.startDate >= inicio && period.endDate <= fim
    && period.endDate <= input.vencimento.toISOString().slice(0, 10);
}
