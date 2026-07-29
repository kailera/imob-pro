export type CobrancaCandidataRascunho = {
  status: string;
  interNossoNumero: string | null;
  interCodigoSolicitacao: string | null;
  interTxId: string | null;
  interBarcode: string | null;
  metadata: unknown;
};

export function cobrancaEhRascunhoReutilizavel(
  cobranca: CobrancaCandidataRascunho,
) {
  return cobranca.status === "PENDENTE"
    && !cobranca.interNossoNumero
    && !cobranca.interCodigoSolicitacao
    && !cobranca.interTxId
    && !cobranca.interBarcode;
}

export function obterCompetenciaDaCobranca(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const competence = (metadata as Record<string, unknown>).competence;
  return typeof competence === "string" && /^\d{4}-\d{2}$/.test(competence)
    ? competence
    : null;
}
