import test from "node:test";
import assert from "node:assert/strict";
import {
  cobrancaEhRascunhoReutilizavel,
  obterCompetenciaDaCobranca,
} from "../lib/financeiro/cobranca-rascunho";

const base = {
  status: "PENDENTE",
  interNossoNumero: null,
  interCodigoSolicitacao: null,
  interTxId: null,
  interBarcode: null,
  metadata: { competence: "2026-09" },
};

test("considera reutilizável somente cobrança pendente sem registro no Inter", () => {
  assert.equal(cobrancaEhRascunhoReutilizavel(base), true);
  assert.equal(cobrancaEhRascunhoReutilizavel({ ...base, status: "LIQUIDADO" }), false);
  assert.equal(cobrancaEhRascunhoReutilizavel({ ...base, interNossoNumero: "123" }), false);
  assert.equal(cobrancaEhRascunhoReutilizavel({
    ...base,
    interCodigoSolicitacao: "codigo",
  }), false);
  assert.equal(cobrancaEhRascunhoReutilizavel({ ...base, interTxId: "txid" }), false);
  assert.equal(cobrancaEhRascunhoReutilizavel({ ...base, interBarcode: "barra" }), false);
});

test("reconhece apenas competências no formato anual mensal", () => {
  assert.equal(obterCompetenciaDaCobranca({ competence: "2026-09" }), "2026-09");
  assert.equal(obterCompetenciaDaCobranca({ competence: "setembro/2026" }), null);
  assert.equal(obterCompetenciaDaCobranca(null), null);
});
