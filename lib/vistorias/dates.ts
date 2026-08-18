const INSPECTION_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function getSaoPauloDateInputValue(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function parseInspectionDate(value: string | Date): Date {
  if (typeof value === "string") {
    const dateOnly = value.match(INSPECTION_DATE_PATTERN);
    if (dateOnly) {
      const [, year, month, day] = dateOnly;
      // Meio-dia UTC mantém a data civil estável em qualquer fuso brasileiro.
      return new Date(`${year}-${month}-${day}T12:00:00.000Z`);
    }
  }

  return value instanceof Date ? new Date(value.getTime()) : new Date(value);
}

export function formatInspectionDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const parsed = parseInspectionDate(value);
  if (Number.isNaN(parsed.getTime())) return "";

  // A data da vistoria é uma data de agenda, não um instante local.
  return parsed.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}
