import assert from "node:assert/strict";
import test from "node:test";
import { calcularFimExclusivoPeriodoInicial } from "../lib/locacao/periodoInicialLease";

test("cria o primeiro período com a periodicidade de reajuste", () => {
  const fim = calcularFimExclusivoPeriodoInicial(
    new Date("2026-01-20T00:00:00.000Z"),
    new Date("2028-07-19T00:00:00.000Z"),
    12,
  );
  assert.equal(fim.toISOString(), "2027-01-20T00:00:00.000Z");
});

test("limita o período inicial ao fim do contrato", () => {
  const fim = calcularFimExclusivoPeriodoInicial(
    new Date("2026-01-20T00:00:00.000Z"),
    new Date("2026-07-19T00:00:00.000Z"),
    12,
  );
  assert.equal(fim.toISOString(), "2026-07-20T00:00:00.000Z");
});
