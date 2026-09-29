import test from "node:test";
import assert from "node:assert/strict";
import { cobrancaEstaRegistradaNoInter } from "../lib/inter-cobranca";
import { lerPeriodoCobrado, periodoCobradoDentroDaVigencia } from "../lib/locacao/periodo-cobrado";
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

const cicloFinal = {
  vencimento: new Date("2026-10-23T00:00:00Z"),
  inicioContrato: new Date("2025-10-23T00:00:00Z"),
  fimContrato: new Date("2026-10-22T00:00:00Z"),
  periodo: { startDate: "2026-09-23", endDate: "2026-10-22" },
};

test("permite pagar em 23/10 o ciclo completo de 23/09 a 22/10", () => {
  assert.equal(periodoCobradoDentroDaVigencia(cicloFinal), true);
});

test("não libera períodos fora do contrato, futuros ou não informados", () => {
  for (const input of [
    { ...cicloFinal, periodo: { startDate: "2026-10-23", endDate: "2026-11-22" } },
    { ...cicloFinal, fimContrato: new Date("2026-10-21T00:00:00Z") },
    { ...cicloFinal, inicioContrato: new Date("2026-10-01T00:00:00Z") },
    { ...cicloFinal, periodo: null },
    { ...cicloFinal, vencimento: new Date("2026-10-21T00:00:00Z") },
    { ...cicloFinal, fimContrato: null },
  ]) {
    assert.equal(periodoCobradoDentroDaVigencia(input), false);
  }
});

test("rejeita datas inexistentes, períodos invertidos e campos incompletos", () => {
  for (const period of [
    { startDate: "2026-02-30", endDate: "2026-03-22" },
    { startDate: "2026-10-23", endDate: "2026-10-22" },
    { startDate: "2026-09-23" },
    { startDate: "", endDate: "2026-10-22" },
  ]) assert.equal(lerPeriodoCobrado(period), null);
});
