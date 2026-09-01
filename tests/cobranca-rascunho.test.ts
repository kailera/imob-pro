import test from "node:test";
import assert from "node:assert/strict";
import {
  cobrancaEhRascunhoReutilizavel,
  criarChaveCobrancaMensal,
  filtrarRascunhosReutilizaveisDaCompetencia,
  obterCompetenciaDaCobranca,
} from "../lib/financeiro/cobranca-rascunho";

test("gera uma chave mensal estável por contrato e competência", () => {
  assert.equal(
    criarChaveCobrancaMensal({ leaseId: "lease-1" }, "2026-09"),
    "aluguel:lease:lease-1:2026-09",
  );
  assert.equal(
    criarChaveCobrancaMensal({ contratoId: "legacy-1" }, "2026-09"),
    "aluguel:legado:legacy-1:2026-09",
  );
});

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

test("não reaproveita cobrança pendente de outra competência", () => {
  const julho = { ...base, id: "julho", metadata: { competence: "2026-07" } };
  const setembro = { ...base, id: "setembro", metadata: { competence: "2026-09" } };
  const setembroEmitido = {
    ...base,
    id: "setembro-emitido",
    interNossoNumero: "123",
  };

  assert.deepEqual(
    filtrarRascunhosReutilizaveisDaCompetencia(
      [julho, setembro, setembroEmitido],
      "2026-09",
    ).map(cobranca => cobranca.id),
    ["setembro"],
  );
});
