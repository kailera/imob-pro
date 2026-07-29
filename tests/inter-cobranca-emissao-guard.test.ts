import test from "node:test";
import assert from "node:assert/strict";
import { cobrancaEstaRegistradaNoInter } from "../lib/inter-cobranca";

test("bloqueia nova emissão quando qualquer identificador bancário já foi salvo", () => {
  assert.equal(cobrancaEstaRegistradaNoInter({
    interCodigoSolicitacao: "codigo",
    interNossoNumero: null,
    interTxId: null,
    interBarcode: null,
  }), true);
  assert.equal(cobrancaEstaRegistradaNoInter({
    interCodigoSolicitacao: null,
    interNossoNumero: null,
    interTxId: null,
    interBarcode: null,
  }), false);
});
