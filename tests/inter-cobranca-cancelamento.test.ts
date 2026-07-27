import test from "node:test";
import assert from "node:assert/strict";
import { respostaInterIndicaCobrancaCancelada } from "../lib/inter-cobranca";

test("considera sucesso quando o Inter informa que a cobrança já está cancelada", () => {
  assert.equal(respostaInterIndicaCobrancaCancelada({
    title: "Requisição inválida",
    detail: "A cobrança não pode ser cancelada, pois se encontra na situação CANCELADO.",
  }), true);
});

test("não ignora outros erros de cancelamento do Inter", () => {
  assert.equal(respostaInterIndicaCobrancaCancelada({
    title: "Requisição inválida",
    detail: "A cobrança já foi recebida.",
  }), false);
});
