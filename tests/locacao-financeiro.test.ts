import test from "node:test";
import assert from "node:assert/strict";
import {
  calcularDescontoPontualidade,
  calcularDataLimiteDesconto,
  calcularMesesContrato,
  calcularMultaQuebra,
  converterMesesParaPercentual,
  converterPercentualParaMeses,
  criarDataVencimento,
  parseNumeroFlexivel,
} from "../lib/locacao/financeiro";
import { resolverPeriodoDaCobranca } from "../lib/locacao/resolverPeriodoCobranca";

test("aceita números digitados nos formatos comum e brasileiro", () => {
  assert.equal(parseNumeroFlexivel("1050"), 1050);
  assert.equal(parseNumeroFlexivel("1050,50"), 1050.5);
  assert.equal(parseNumeroFlexivel("1.050,50"), 1050.5);
  assert.equal(parseNumeroFlexivel("R$ 1.050,50"), 1050.5);
  assert.equal(parseNumeroFlexivel("9.52%"), 9.52);
  assert.equal(parseNumeroFlexivel(""), null);
});

test("converte a cláusula entre percentual e meses sem alterar a equivalência", () => {
  assert.equal(calcularMesesContrato("2024-10-30", "2027-10-29"), 36);
  assert.equal(converterPercentualParaMeses(10, 36), 3.6);
  assert.equal(converterMesesParaPercentual(3.6, 36), 10);
});

test("calcula a multa proporcional do exemplo confirmado", () => {
  const resultado = calcularMultaQuebra({
    aluguelPeriodo: 1050,
    percentual: 10,
    dataInicioContrato: "2024-10-30",
    dataFimContrato: "2027-10-29",
    dataRescisao: "2026-07-30",
  });

  assert.equal(resultado.prazoTotalMeses, 36);
  assert.equal(resultado.mesesMultaCheia, 3.6);
  assert.equal(resultado.mesesRestantesEquivalentes, 15);
  assert.equal(resultado.multaMaxima, 3780);
  assert.equal(resultado.multaProporcional, 1575);
});

test("mantém desconto fixo e recalcula desconto percentual sobre o aluguel do período", () => {
  assert.equal(calcularDescontoPontualidade(1050, 9.52, "PERCENTUAL"), 99.96);
  assert.equal(calcularDescontoPontualidade(1400, 100, "VALOR"), 100);
});

test("limita vencimentos ao último dia do mês", () => {
  assert.equal(criarDataVencimento(2027, 2, 31).toISOString().slice(0, 10), "2027-02-28");
  assert.equal(criarDataVencimento(2028, 2, 31).toISOString().slice(0, 10), "2028-02-29");
});

test("calcula a data-limite do desconto pela antecedência", () => {
  assert.equal(calcularDataLimiteDesconto("2026-08-15", 5).toISOString().slice(0, 10), "2026-08-10");
});

test("resolve o período pela identificação registrada na cobrança", () => {
  const periodos = [
    { id: "base", dataInicio: "2025-01-20", dataFim: "2026-01-19" },
    { id: "reajuste", dataInicio: "2026-01-20", dataFim: "2027-01-19" },
  ];
  assert.equal(resolverPeriodoDaCobranca(periodos, { periodId: "base" }, "2026-01-27")?.id, "base");
});

test("usa a competência para cobranças antigas sem identificação do período", () => {
  const periodos = [
    { id: "base", dataInicio: "2025-01-20", dataFim: "2026-01-19" },
    { id: "reajuste", dataInicio: "2026-01-20", dataFim: "2027-01-19" },
  ];
  assert.equal(resolverPeriodoDaCobranca(periodos, { competence: "2026-01" }, "2026-01-27")?.id, "base");
});
