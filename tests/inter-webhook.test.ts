import assert from "node:assert/strict";
import test from "node:test";
import {
  InterWebhookValidationError,
  createInterWebhookEventKey,
  parseInterWebhookPayload,
  webhookSecretMatches,
} from "../lib/inter-webhook";

const validEvent = {
  codigoSolicitacao: "123e4567-e89b-12d3-a456-426614174000",
  nossoNumero: "00000000001",
  seuNumero: "abc123",
  situacao: "RECEBIDO",
  dataHoraSituacao: "2026-07-21T18:30:00Z",
  valorTotalRecebido: "1500.50",
  origemRecebimento: "BOLETO",
};

test("normaliza um callback válido da Cobrança V3", () => {
  const [event] = parseInterWebhookPayload([validEvent]);
  assert.equal(event.situacao, "RECEBIDO");
  assert.equal(event.valorTotalRecebido, "1500.50");
  assert.equal(event.origemRecebimento, "BOLETO");
});

test("rejeita evento sem identificador", () => {
  assert.throws(
    () => parseInterWebhookPayload([{ situacao: "RECEBIDO" }]),
    InterWebhookValidationError,
  );
});

test("rejeita valor monetário fora do contrato", () => {
  assert.throws(
    () => parseInterWebhookPayload([{ ...validEvent, valorTotalRecebido: "1.234,56" }]),
    InterWebhookValidationError,
  );
});

test("gera a mesma chave para o mesmo callback", () => {
  const [event] = parseInterWebhookPayload([validEvent]);
  assert.equal(
    createInterWebhookEventKey(event, "123456"),
    createInterWebhookEventKey(event, "123456"),
  );
});

test("distingue callbacks de contas diferentes", () => {
  const [event] = parseInterWebhookPayload([validEvent]);
  assert.notEqual(
    createInterWebhookEventKey(event, "123456"),
    createInterWebhookEventKey(event, "654321"),
  );
});

test("exige segredo interno forte e compara sem coerção", () => {
  const secret = "0123456789abcdef0123456789abcdef";
  assert.equal(webhookSecretMatches(secret, secret), true);
  assert.equal(webhookSecretMatches(`${secret}x`, secret), false);
  assert.equal(webhookSecretMatches("curto", "curto"), false);
});
