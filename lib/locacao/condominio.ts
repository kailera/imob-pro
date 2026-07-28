export interface CondominioParaCobranca {
  amount: number | string | { toString(): string } | null;
  responsibleParty: string | null;
}

function normalizarResponsavel(valor: string | null | undefined) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toUpperCase();
}

export function calcularCondominioDaCobranca(
  condominium: CondominioParaCobranca | null | undefined,
) {
  const valor = Number(condominium?.amount ?? 0);
  if (!Number.isFinite(valor) || valor <= 0) return 0;
  if (normalizarResponsavel(condominium?.responsibleParty) === "LOCADOR") return 0;
  return Number(valor.toFixed(2));
}
