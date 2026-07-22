import { createHash, timingSafeEqual } from "node:crypto";

const MAX_EVENTS = 100;
const ALLOWED_ORIGINS = new Set(["BOLETO", "PIX"]);

export interface InterWebhookPayload {
  codigoSolicitacao?: string;
  nossoNumero?: string;
  seuNumero?: string;
  situacao: string;
  dataHoraSituacao?: string;
  valorTotalRecebido?: string;
  origemRecebimento?: "BOLETO" | "PIX";
  txid?: string;
  [key: string]: unknown;
}

export class InterWebhookValidationError extends Error {}

function optionalString(value: unknown, field: string, maxLength: number): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new InterWebhookValidationError(`${field} deve ser texto.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new InterWebhookValidationError(`${field} possui tamanho inválido.`);
  }
  return normalized;
}

export function parseInterWebhookPayload(body: unknown): InterWebhookPayload[] {
  if (!Array.isArray(body) || body.length === 0 || body.length > MAX_EVENTS) {
    throw new InterWebhookValidationError(`O payload deve conter entre 1 e ${MAX_EVENTS} eventos.`);
  }

  return body.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new InterWebhookValidationError(`Evento ${index + 1} inválido.`);
    }
    const event = raw as Record<string, unknown>;
    const codigoSolicitacao = optionalString(event.codigoSolicitacao, "codigoSolicitacao", 100);
    const nossoNumero = optionalString(event.nossoNumero, "nossoNumero", 100);
    const seuNumero = optionalString(event.seuNumero, "seuNumero", 100);
    if (!codigoSolicitacao && !nossoNumero && !seuNumero) {
      throw new InterWebhookValidationError(`Evento ${index + 1} sem identificador da cobrança.`);
    }

    const situacao = optionalString(event.situacao, "situacao", 50)?.toUpperCase();
    if (!situacao || !/^[A-Z_]+$/.test(situacao)) {
      throw new InterWebhookValidationError(`Evento ${index + 1} com situação inválida.`);
    }

    const origem = optionalString(event.origemRecebimento, "origemRecebimento", 20)?.toUpperCase();
    if (origem && !ALLOWED_ORIGINS.has(origem)) {
      throw new InterWebhookValidationError(`Evento ${index + 1} com origem de recebimento inválida.`);
    }

    const dataHoraSituacao = optionalString(event.dataHoraSituacao, "dataHoraSituacao", 50);
    if (dataHoraSituacao && Number.isNaN(Date.parse(dataHoraSituacao))) {
      throw new InterWebhookValidationError(`Evento ${index + 1} com data/hora inválida.`);
    }

    let valorTotalRecebido: string | undefined;
    if (event.valorTotalRecebido !== undefined && event.valorTotalRecebido !== null) {
      const rawValue = String(event.valorTotalRecebido).trim();
      if (!/^\d{1,13}(?:\.\d{1,2})?$/.test(rawValue)) {
        throw new InterWebhookValidationError(`Evento ${index + 1} com valor recebido inválido.`);
      }
      valorTotalRecebido = Number(rawValue).toFixed(2);
    }

    return {
      ...event,
      codigoSolicitacao,
      nossoNumero,
      seuNumero,
      situacao,
      dataHoraSituacao,
      valorTotalRecebido,
      origemRecebimento: origem as "BOLETO" | "PIX" | undefined,
      txid: optionalString(event.txid, "txid", 100),
    };
  });
}

export function createInterWebhookEventKey(event: InterWebhookPayload, account: string | null): string {
  const source = [
    account ?? "",
    event.codigoSolicitacao ?? "",
    event.nossoNumero ?? "",
    event.seuNumero ?? "",
    event.situacao,
    event.dataHoraSituacao ?? "",
    event.valorTotalRecebido ?? "",
    event.origemRecebimento ?? "",
    event.txid ?? "",
  ].join("|");
  return createHash("sha256").update(source, "utf8").digest("hex");
}

export function webhookSecretMatches(received: string | null, expected: string | undefined): boolean {
  if (!received || !expected || expected.length < 32) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}
