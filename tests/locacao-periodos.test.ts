import assert from "node:assert/strict";
import test from "node:test";
import {
  adicionarDiasUTC,
  calcularFaixaPeriodo,
  calcularPercentualEntreValores,
  datasSaoConsecutivas,
  formatarDataInput,
  inicioMesUTC,
  proximoMesUTC,
} from "../lib/locacao/periodos";

test("calcula período anual inclusivo no padrão usado pelo Sicadi", () => {
  const faixa = calcularFaixaPeriodo("2025-01-20", 12, "2028-01-19");
  assert.equal(formatarDataInput(faixa.dataInicio), "2025-01-20");
  assert.equal(formatarDataInput(faixa.dataFim), "2026-01-19");
});

test("limita o último período ao término total do contrato", () => {
  const faixa = calcularFaixaPeriodo("2027-07-10", 12, "2028-01-19");
  assert.equal(formatarDataInput(faixa.dataFim), "2028-01-19");
});

test("trata corretamente aniversário iniciado no último dia do mês", () => {
  const faixa = calcularFaixaPeriodo("2024-02-29", 12, "2027-02-28");
  assert.equal(formatarDataInput(faixa.dataFim), "2025-02-27");
});

test("reconhece períodos consecutivos sem sobreposição", () => {
  assert.equal(datasSaoConsecutivas("2026-01-19", "2026-01-20"), true);
  assert.equal(datasSaoConsecutivas("2026-01-19", "2026-01-21"), false);
});

test("apura percentual histórico pelos valores informados", () => {
  assert.equal(calcularPercentualEntreValores(1250, 1400), 12);
  assert.equal(calcularPercentualEntreValores(0, 1400), null);
});

test("intervalo mensal é semiaberto e não perde eventos na virada do mês", () => {
  const inicio = inicioMesUTC(2026, 7);
  const fimExclusivo = proximoMesUTC(2026, 7);
  const reajusteEmJulho = adicionarDiasUTC("2026-06-30", 1);
  const reajusteEmAgosto = adicionarDiasUTC("2026-07-31", 1);

  assert.equal(reajusteEmJulho >= inicio && reajusteEmJulho < fimExclusivo, true);
  assert.equal(reajusteEmAgosto >= inicio && reajusteEmAgosto < fimExclusivo, false);
});
