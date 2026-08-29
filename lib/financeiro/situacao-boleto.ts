import { asMetadataRecord, numeroSeguro } from "./boleto-composicao";

export type SituacaoVisualBoleto =
  | "Liquidado"
  | "Não gerado"
  | "Recepcionado"
  | "Não pago"
  | "Cancelado"
  | "Baixado";

const STATUS_INTER_LIQUIDADOS = new Set(["PAGO", "LIQUIDADO", "RECEBIDO"]);
const STATUS_INTER_ENCERRADOS = new Set(["CANCELADO", "BAIXADO", "EXPIRADO", "FALHA_EMISSAO"]);

export function resolverSituacaoVisualBoleto(input: {
  status: string;
  dataVencimento: string | Date;
  hoje: string;
  interStatus?: string | null;
  interNossoNumero?: string | null;
  interCodigoSolicitacao?: string | null;
  interTxId?: string | null;
  interBarcode?: string | null;
  metadata?: unknown;
}) {
  const interStatus = input.interStatus?.trim().toUpperCase() ?? "";
  const possuiBoleto = Boolean(
    input.interNossoNumero
    || input.interCodigoSolicitacao
    || input.interTxId
    || input.interBarcode,
  );
  const liquidado = input.status === "LIQUIDADO" || STATUS_INTER_LIQUIDADOS.has(interStatus);
  const encerrado = input.status === "CANCELADO" || STATUS_INTER_ENCERRADOS.has(interStatus);
  const dataVencimento = typeof input.dataVencimento === "string"
    ? input.dataVencimento.slice(0, 10)
    : input.dataVencimento.toISOString().slice(0, 10);
  const vencido = dataVencimento < input.hoje;
  const conditions = asMetadataRecord(asMetadataRecord(input.metadata).billingConditions);
  const possuiEncargos = numeroSeguro(conditions.lateFeePercentage) > 0
    || numeroSeguro(conditions.lateInterestMonthly) > 0;

  if (liquidado) {
    return { situacao: "Liquidado" as const, interStatusLabel: "Liquidado", possuiBoleto, boletoAtivo: false, podeCorrigirEReemitir: false };
  }
  if (!possuiBoleto) {
    return {
      situacao: encerrado ? "Cancelado" as const : "Não gerado" as const,
      interStatusLabel: "Não gerado",
      possuiBoleto,
      boletoAtivo: false,
      podeCorrigirEReemitir: false,
    };
  }
  if (vencido) {
    return {
      situacao: "Não pago" as const,
      interStatusLabel: encerrado
        ? "Boleto encerrado — corrigir e reemitir"
        : possuiEncargos ? "Boleto vigente com multa" : "Boleto vencido vigente",
      possuiBoleto,
      boletoAtivo: !encerrado,
      podeCorrigirEReemitir: encerrado,
    };
  }
  if (encerrado) {
    return {
      situacao: "Cancelado" as const,
      interStatusLabel: "Boleto cancelado",
      possuiBoleto,
      boletoAtivo: false,
      podeCorrigirEReemitir: false,
    };
  }
  return {
    situacao: "Recepcionado" as const,
    interStatusLabel: interStatus === "EM_PROCESSAMENTO" ? "Em processamento" : "Boleto vigente",
    possuiBoleto,
    boletoAtivo: true,
    podeCorrigirEReemitir: false,
  };
}
