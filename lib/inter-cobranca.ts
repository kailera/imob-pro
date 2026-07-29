export type DescontoInterV3 = {
  codigo: "VALORFIXODATAINFORMADA" | "PERCENTUALDATAINFORMADA";
  quantidadeDias: number;
  valor?: number;
  taxa?: number;
};

/** Converte a bonificação contratual para o payload da API Cobrança V3 do Inter. */
export function criarDescontoInterV3(input: {
  valor: number | null | undefined;
  tipo: string | null | undefined;
  diasAntesDoVencimento: number | null | undefined;
}): DescontoInterV3 | undefined {
  if (!input.valor || input.valor <= 0) return undefined;

  const quantidadeDias = Math.max(0, Math.trunc(input.diasAntesDoVencimento ?? 0));
  if (input.tipo === "VALOR" || input.tipo === "FIXED") {
    return { codigo: "VALORFIXODATAINFORMADA", quantidadeDias, valor: input.valor };
  }
  if (
    input.tipo === "PERCENTUAL"
    || input.tipo === "PERCENTAGE"
    || input.tipo === "PERCENT"
  ) {
    return { codigo: "PERCENTUALDATAINFORMADA", quantidadeDias, taxa: input.valor };
  }
  return undefined;
}

export function criarInstrucoesBoletoInter(input: {
  desconto?: DescontoInterV3;
  multaPercentual?: number | null;
  jurosMensal?: number | null;
  dataVencimento: string;
}): string[] {
  const instrucoes: string[] = [];

  if (input.desconto) {
    const limite = new Date(`${input.dataVencimento}T00:00:00.000Z`);
    limite.setUTCDate(limite.getUTCDate() - input.desconto.quantidadeDias);
    const dataLimite = limite.toLocaleDateString("pt-BR", { timeZone: "UTC" });
    const valorDesconto = input.desconto.valor != null
      ? input.desconto.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\u00a0/g, " ")
      : `${(input.desconto.taxa ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
    instrucoes.push(`Pagamento com desconto de ${valorDesconto} ate dia ${dataLimite}.`);
  }

  if (input.multaPercentual && input.multaPercentual > 0) {
    const multa = input.multaPercentual.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    instrucoes.push(`Apos o vencimento: multa de ${multa}%.`);
  }

  if (input.jurosMensal && input.jurosMensal > 0) {
    const juros = input.jurosMensal.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
    const jurosText = `Juros ${juros}% ao mes, pro rata dia.`;
    if (input.multaPercentual && input.multaPercentual > 0) {
      instrucoes[instrucoes.length - 1] += ` ${jurosText}`;
    } else {
      instrucoes.push(jurosText);
    }
  }

  return instrucoes;
}

function valorMonetarioCompacto(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function criarResumoComposicaoBoletoInter(input: {
  metadata: unknown;
  valorNominal: number;
  dataVencimento: string;
}) {
  const metadata = (
    input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
      ? input.metadata
      : {}
  ) as Record<string, unknown>;
  const componentKeys = [
    "rentValue",
    "iptuValue",
    "condominiumValue",
    "waterValue",
    "electricityValue",
    "gasValue",
  ];
  const hasDetailedComposition = componentKeys.some(key =>
    Number.isFinite(Number(metadata[key])),
  );
  const rentValue = hasDetailedComposition
    ? Number(metadata.rentValue ?? 0)
    : input.valorNominal;
  const components = [
    ["ALUG", rentValue],
    ["IPTU", Number(metadata.iptuValue ?? 0)],
    ["COND", Number(metadata.condominiumValue ?? 0)],
    ["AGUA", Number(metadata.waterValue ?? 0)],
    ["ENERG", Number(metadata.electricityValue ?? 0)],
    ["GAS", Number(metadata.gasValue ?? 0)],
  ] as const;
  const componentText = components
    .filter(([, value]) => Number.isFinite(value) && value > 0)
    .map(([label, value]) => `${label} RS ${valorMonetarioCompacto(value)}`)
    .join("; ");

  const competence = typeof metadata.competence === "string"
    && /^\d{4}-\d{2}$/.test(metadata.competence)
    ? `${metadata.competence.slice(5, 7)}/${metadata.competence.slice(0, 4)}`
    : null;
  const dueDate = new Date(`${input.dataVencimento}T00:00:00.000Z`)
    .toLocaleDateString("pt-BR", { timeZone: "UTC" });
  const reference = [
    "REF: ALUGUEL",
    competence ? `COMP ${competence}` : null,
    `VENC ${dueDate}`,
  ].filter(Boolean).join(" - ");

  return [
    reference,
    componentText
      ? `COMPOSICAO: ${componentText}; TOTAL RS ${valorMonetarioCompacto(input.valorNominal)}`
      : `TOTAL NOMINAL: RS ${valorMonetarioCompacto(input.valorNominal)}`,
  ];
}

export function criarEstadoParaNovaEmissaoInter() {
  return {
    interNossoNumero: null,
    interCodigoSolicitacao: null,
    interSeuNumero: null,
    interTxId: null,
    interPixCode: null,
    interBarcode: null,
    interPdfKey: null,
    interStatus: null,
    interOrigemRecebimento: null,
    interDataRecebimento: null,
    interValorRecebido: null,
    status: "PENDENTE" as const,
  };
}

export function resolverBonificacaoLease(input: {
  valorPeriodo: unknown;
  tipoPeriodo: string | null | undefined;
  diasPeriodo: number | null | undefined;
  valorContrato: unknown;
  tipoContrato: string | null | undefined;
  diasContrato: number | null | undefined;
}) {
  const usarPeriodo = input.valorPeriodo !== null && input.valorPeriodo !== undefined;
  return {
    valor: Number(usarPeriodo ? input.valorPeriodo : (input.valorContrato ?? 0)),
    tipo: usarPeriodo ? input.tipoPeriodo : input.tipoContrato,
    diasAntesDoVencimento: usarPeriodo ? input.diasPeriodo : input.diasContrato,
  };
}

export function respostaInterIndicaCobrancaCancelada(data: unknown) {
  if (!data || typeof data !== "object") return false;
  const resposta = data as Record<string, unknown>;
  const texto = [resposta.title, resposta.detail, resposta.message]
    .filter((valor): valor is string => typeof valor === "string")
    .join(" ");
  return /situa[cç][aã]o\s+CANCELADO/i.test(texto);
}
