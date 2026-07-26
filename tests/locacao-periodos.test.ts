import assert from "node:assert/strict";
import test from "node:test";
import {
  adicionarDiasUTC,
  calcularIntervaloCompetenciasReajuste,
  calcularFaixaPeriodo,
  calcularPercentualEntreValores,
  datasSaoConsecutivas,
  formatarDataInput,
  inicioMesUTC,
  proximoMesUTC,
  sugerirLacunaPeriodo,
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

test("reajuste mensal usa competências fechadas até o mês anterior", () => {
  const intervaloDiaQuatorze = calcularIntervaloCompetenciasReajuste("2025-07-14", "2026-07-13");
  assert.equal(intervaloDiaQuatorze.dataInicio.toISOString().slice(0, 10), "2025-07-01");
  assert.equal(intervaloDiaQuatorze.dataFim.toISOString().slice(0, 10), "2026-06-30");

  const intervaloViradaMes = calcularIntervaloCompetenciasReajuste("2025-07-01", "2026-06-30");
  assert.equal(intervaloViradaMes.dataInicio.toISOString().slice(0, 10), "2025-07-01");
  assert.equal(intervaloViradaMes.dataFim.toISOString().slice(0, 10), "2026-06-30");
});

test("sugere o período inicial quando o histórico ainda não começou", () => {
  const faixa = sugerirLacunaPeriodo("2025-07-14", "2028-07-13", [], 12);
  assert.equal(formatarDataInput(faixa!.dataInicio), "2025-07-14");
  assert.equal(formatarDataInput(faixa!.dataFim), "2026-07-13");
});

test("sugere a primeira lacuna entre períodos já cadastrados", () => {
  const faixa = sugerirLacunaPeriodo("2024-01-01", "2027-12-31", [
    { dataInicio: "2024-01-01", dataFim: "2024-12-31" },
    { dataInicio: "2026-01-01", dataFim: "2026-12-31" },
  ]);
  assert.equal(formatarDataInput(faixa!.dataInicio), "2025-01-01");
  assert.equal(formatarDataInput(faixa!.dataFim), "2025-12-31");
});

test("não sugere período quando toda a vigência está coberta", () => {
  const faixa = sugerirLacunaPeriodo("2025-01-01", "2025-12-31", [
    { dataInicio: "2025-01-01", dataFim: "2025-12-31" },
  ]);
  assert.equal(faixa, null);
});
