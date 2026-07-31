import type { BoletoChargeItem } from "@/lib/financeiro/boleto-composicao";

export type DescontoInterV3 = {
  codigo: "VALORFIXODATAINFORMADA" | "PERCENTUALDATAINFORMADA";
  quantidadeDias: number;
  valor?: number;
  taxa?: number;
};

export function extrairSituacaoCobrancaInter(response: unknown): string | null {
  if (!response || typeof response !== "object" || Array.isArray(response)) return null;
  const root = response as Record<string, unknown>;
  const nested = root.cobranca;
  const cobranca = nested && typeof nested === "object" && !Array.isArray(nested)
    ? nested as Record<string, unknown>
    : root;
  return typeof cobranca.situacao === "string" && cobranca.situacao.length > 0
    ? cobranca.situacao
    : null;
}

export function criarMoraInterV3(taxaMensal: number | null | undefined) {
  if (!taxaMensal || taxaMensal <= 0) return undefined;
  return {
    codigo: "TAXAMENSAL" as const,
    taxa: taxaMensal,
  };
}

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

export type MensagemInter = Partial<Record<
  "linha1" | "linha2" | "linha3" | "linha4" | "linha5",
  string
>>;

export function formatarMensagemInter(descricao: string): MensagemInter {
  if (!descricao) return {};

  const blocks = descricao.split(/\r?\n/).map(block => block
    .replace(/R\$/gi, "RS")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s.,\-/:;()%]/g, "")
    .replace(/[^\S\r\n]+/g, " ")
    .trim()
  ).filter(Boolean);
  const lines: string[] = [];

  for (const block of blocks) {
    const words = block.split(" ");
    let currentLine = "";
    for (const word of words) {
      if (!word) continue;
      if ((currentLine ? `${currentLine} ${word}` : word).length <= 78) {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      } else {
        if (currentLine) lines.push(currentLine);
        let remaining = word;
        while (remaining.length > 78) {
          lines.push(remaining.substring(0, 78));
          remaining = remaining.substring(78);
        }
        currentLine = remaining;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  return Object.fromEntries(
    lines.slice(0, 5).map((line, index) => [`linha${index + 1}`, line.substring(0, 78)]),
  ) as MensagemInter;
}

export function criarResumoComposicaoBoletoInter(input: {
  metadata: unknown;
  valorNominal: number;
  dataVencimento: string;
  items?: BoletoChargeItem[];
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
  const labels: Record<string, string> = {
    RENT: "ALUG",
    CONDOMINIUM: "COND",
    IPTU: "IPTU",
    WATER: "AGUA",
    ENERGY: "ENERG",
    GAS: "GAS",
    OTHER: "OUTROS",
  };
  const components = input.items?.length
    ? input.items
        .filter(item => item.type !== "DISCOUNT")
        .map(item => [labels[item.type] ?? "OUTROS", item.amount] as const)
    : [
        ["ALUG", rentValue],
        ["COND", Number(metadata.condominiumValue ?? 0)],
        ["IPTU", Number(metadata.iptuValue ?? 0)],
        ["AGUA", Number(metadata.waterValue ?? 0)],
        ["ENERG", Number(metadata.electricityValue ?? 0)],
        ["GAS", Number(metadata.gasValue ?? 0)],
        ["OUTROS", Number(metadata.otherValue ?? 0)],
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

export function criarMensagemCobrancaInter(input: {
  metadata: unknown;
  items?: BoletoChargeItem[];
  valorNominal: number;
  dataVencimento: string;
  desconto?: DescontoInterV3;
  multaPercentual?: number | null;
  jurosMensal?: number | null;
}) {
  const resumo = criarResumoComposicaoBoletoInter(input);
  const instrucoes = criarInstrucoesBoletoInter({
    desconto: input.desconto,
    multaPercentual: input.multaPercentual,
    jurosMensal: input.jurosMensal,
    dataVencimento: input.dataVencimento,
  });
  return formatarMensagemInter([...resumo, ...instrucoes].join("\n"));
}

export function linhasMensagemInter(mensagem: unknown): string[] {
  if (!mensagem || typeof mensagem !== "object" || Array.isArray(mensagem)) return [];
  const record = mensagem as Record<string, unknown>;
  return ["linha1", "linha2", "linha3", "linha4", "linha5"]
    .map(key => record[key])
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

export function cobrancaEstaRegistradaNoInter(input: {
  interCodigoSolicitacao?: string | null;
  interNossoNumero?: string | null;
  interTxId?: string | null;
  interBarcode?: string | null;
}) {
  return Boolean(
    input.interCodigoSolicitacao
    || input.interNossoNumero
    || input.interTxId
    || input.interBarcode
  );
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
