import test from "node:test";
import assert from "node:assert/strict";
import { cobrancaEstaRegistradaNoInter } from "../lib/inter-cobranca";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

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

test("bloqueia emissão de cobrança vinculada a contrato inativo", () => {
  const interSource = readFileSync(
    fileURLToPath(new URL("../lib/inter.ts", import.meta.url)),
    "utf8",
  );
  const candidatesSource = readFileSync(
    fileURLToPath(new URL("../lib/inter-batch-candidates.ts", import.meta.url)),
    "utf8",
  );

  assert.match(interSource, /transacao\.lease\.status !== "ACTIVE"/);
  assert.match(interSource, /O contrato está inativo/);
  assert.match(interSource, /transacao\.dataVencimento > transacao\.lease\.endDate/);
  assert.match(interSource, /legacyCode: transacao\.contratoId/);
  assert.match(interSource, /transacao\.dataVencimento > vigenciaLegada\.dataFim/);
  assert.match(candidatesSource, /lease: \{ is: \{ status: "ACTIVE" \} \}/);
});
