import type { BoletoChargeItem } from "@/lib/financeiro/boleto-composicao";
import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import type https from "https";

export type CancelarBoletoInterInput = {
  baseUrl: string;
  codigoSolicitacao: string;
  accessToken: string;
  httpsAgent: https.Agent;
  motivoCancelamento?: string;
};

type InterPost = (
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
) => Promise<AxiosResponse>;

/**
 * Envia o cancelamento de uma cobrança para a API Cobrança V3 do Banco Inter.
 *
 * POST /cobranca/v3/cobrancas/{codigoSolicitacao}/cancelar
 * Escopo OAuth requerido: boleto-cobranca.write
 */
export async function cancelarBoletoInter(
  input: CancelarBoletoInterInput,
  post: InterPost = axios.post,
): Promise<void> {
  const codigoSolicitacao = input.codigoSolicitacao.trim();
  const motivoCancelamento = (
    input.motivoCancelamento ?? "Cancelamento solicitado pela imobiliaria"
  ).trim();

  if (!codigoSolicitacao) {
    throw new Error("O código de solicitação da cobrança é obrigatório.");
  }
  if (!motivoCancelamento || motivoCancelamento.length > 50) {
    throw new Error("O motivo do cancelamento deve ter entre 1 e 50 caracteres.");
  }

  const baseUrl = input.baseUrl.replace(/\/$/, "");
  await post(
    `${baseUrl}/cobranca/v3/cobrancas/${encodeURIComponent(codigoSolicitacao)}/cancelar`,
    { motivoCancelamento },
    {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      httpsAgent: input.httpsAgent,
    },
  );
}

export type DescontoInterV3 = {
  codigo: "VALORFIXODATAINFORMADA" | "PERCENTUALDATAINFORMADA";
  quantidadeDias: number;
  valor?: number;
  taxa?: number;
};

function stringNaoVazia(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Monta uma mensagem acionável a partir do application/problem+json do Inter.
 * A API usa `title` genérico e informa a causa real em `violacoes`.
 */
export function extrairMensagemErroInter(response: unknown): string | null {
  if (!response || typeof response !== "object" || Array.isArray(response)) return null;

  const data = response as Record<string, unknown>;
  const rawViolations = Array.isArray(data.violacoes)
    ? data.violacoes
    : Array.isArray(data.violations)
      ? data.violations
      : [];
  const violations = rawViolations.flatMap((violation) => {
    if (typeof violation === "string") {
      const text = violation.trim();
      return text ? [text] : [];
    }
    if (!violation || typeof violation !== "object" || Array.isArray(violation)) return [];

    const item = violation as Record<string, unknown>;
    const property = stringNaoVazia(
      item.propriedade ?? item.property ?? item.campo ?? item.field,
    );
    const reason = stringNaoVazia(
      item.razao ?? item.reason ?? item.mensagem ?? item.message ?? item.detail,
    );
    if (!property && !reason) return [];
    return [property && reason ? `${property}: ${reason}` : (reason ?? property)!];
  });

  if (violations.length > 0) {
    return `Inter rejeitou a cobrança: ${violations.join("; ")}`;
  }

  return stringNaoVazia(data.detail)
    ?? stringNaoVazia(data.message)
    ?? stringNaoVazia(data.title);
}

/** Remove caracteres de controle/corrupção sem tentar reconstruir dados cadastrais. */
export function sanitizarTextoPagadorInter(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f-\u009f\ufffd]/g, " ")
    .replace(/[^\p{L}\p{N}\s.,'’&()\-\/]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
    .trim();
}

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

export function extrairRecebimentoCobrancaInter(response: unknown): {
  data: Date | null;
  origem: string | null;
  valor: number | null;
  seuNumero: string | null;
} {
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    return { data: null, origem: null, valor: null, seuNumero: null };
  }

  const root = response as Record<string, unknown>;
  const nested = root.cobranca;
  const cobranca = nested && typeof nested === "object" && !Array.isArray(nested)
    ? nested as Record<string, unknown>
    : root;
  const dataSituacao = typeof cobranca.dataSituacao === "string"
    ? cobranca.dataSituacao
    : null;
  const parsedDate = dataSituacao
    ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(dataSituacao)
        ? `${dataSituacao}T12:00:00.000Z`
        : dataSituacao)
    : null;
  const valor = Number(cobranca.valorTotalRecebido);

  return {
    data: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
    origem: typeof cobranca.origemRecebimento === "string"
      ? cobranca.origemRecebimento
      : null,
    valor: Number.isFinite(valor) ? valor : null,
    seuNumero: typeof cobranca.seuNumero === "string" ? cobranca.seuNumero : null,
  };
}

export function criarMoraInterV3(taxaMensal: number | null | undefined) {
  if (!taxaMensal || taxaMensal <= 0) return undefined;
  return {
    codigo: "TAXAMENSAL" as const,
    taxa: taxaMensal,
  };
}

/**
 * O Inter imprime "Data limite para pagamento" quando há dias de agenda.
 * Acordos sem encargos vencem na data informada. O Inter exige agenda positiva
 * quando multa ou juros são enviados; nesse caso, mantém a agenda padrão.
 */
export function resolverNumDiasAgendaInter(metadata: unknown, hasLateCharges = false) {
  const record = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : {};
  return record.origin === "MANUAL_AGREEMENT" && !hasLateCharges ? 0 : 30;
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
  if (metadata.origin === "MANUAL_AGREEMENT") {
    const descricao = typeof metadata.agreementDescription === "string"
      ? metadata.agreementDescription.trim()
      : "Acordo de débitos";
    return [
      `ACORDO: ${descricao}`,
      `TOTAL NOMINAL: RS ${valorMonetarioCompacto(input.valorNominal)}`,
    ];
  }
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
    LATE_FEE: "MULTA",
    LATE_INTEREST: "JUROS",
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
    // A mensagem pertence ao boleto cancelado. Mantê-la durante a reemissão
    // faz a tela misturar a composição nova com desconto/multa antigos.
    interMensagem: {},
    status: "PENDENTE" as const,
  };
}

export function criarMetadataNovaEmissaoInter(metadata: unknown) {
  const current = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : {};
  const previousSequence = Number(current.interEmissionSequence ?? 0);
  return {
    ...current,
    interEmissionSequence: Number.isFinite(previousSequence)
      ? Math.max(0, Math.trunc(previousSequence)) + 1
      : 1,
  };
}

export function criarSeuNumeroInter(transactionId: string, metadata: unknown) {
  const cleanId = transactionId.replace(/[^a-zA-Z0-9]/g, "");
  const current = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : {};
  const sequence = Math.max(0, Math.trunc(Number(current.interEmissionSequence ?? 0)) || 0);
  if (sequence === 0) return cleanId.substring(0, 15);
  return `${cleanId.substring(0, 11)}${String(sequence).padStart(4, "0").slice(-4)}`;
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
