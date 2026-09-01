export type CobrancaCandidataRascunho = {
  status: string;
  interNossoNumero: string | null;
  interCodigoSolicitacao: string | null;
  interTxId: string | null;
  interBarcode: string | null;
  metadata: unknown;
};

export function criarChaveCobrancaMensal(
  referencia: { leaseId?: string | null; contratoId?: string | null },
  competencia: string,
) {
  if (!/^\d{4}-\d{2}$/.test(competencia)) {
    throw new Error("Competência inválida para a cobrança mensal.");
  }

  if (referencia.leaseId) return `aluguel:lease:${referencia.leaseId}:${competencia}`;
  if (referencia.contratoId) return `aluguel:legado:${referencia.contratoId}:${competencia}`;
  throw new Error("Contrato não informado para a cobrança mensal.");
}

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

export function filtrarRascunhosReutilizaveisDaCompetencia<
  T extends CobrancaCandidataRascunho,
>(cobrancas: T[], competencia: string) {
  return cobrancas.filter(cobranca => (
    cobrancaEhRascunhoReutilizavel(cobranca)
    && obterCompetenciaDaCobranca(cobranca.metadata) === competencia
  ));
}
