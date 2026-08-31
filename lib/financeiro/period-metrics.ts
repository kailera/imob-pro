export type FinanceMetricMonthRange = {
  start: Date;
  endExclusive: Date;
};

export function getFinanceMetricMonthRange(
  month: string,
): FinanceMetricMonthRange | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (year < 2000 || year > 2200) return null;

  return {
    start: new Date(Date.UTC(year, monthIndex, 1)),
    endExclusive: new Date(Date.UTC(year, monthIndex + 1, 1)),
  };
}

export function contractOverlapsFinancePeriod(
  contractStart: Date | string | null | undefined,
  contractEnd: Date | string | null | undefined,
  range: FinanceMetricMonthRange,
) {
  if (!contractStart) return false;
  const start = new Date(contractStart);
  const end = contractEnd ? new Date(contractEnd) : null;
  if (Number.isNaN(start.getTime()) || (end && Number.isNaN(end.getTime()))) {
    return false;
  }

  return start < range.endExclusive && (!end || end >= range.start);
}

export function normalizedContractDocument(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

export function getCalendarDayStartInTimeZone(
  now = new Date(),
  timeZone = "America/Sao_Paulo",
) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
}
