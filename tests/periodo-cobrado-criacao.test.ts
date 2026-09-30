import test from "node:test";
import assert from "node:assert/strict";
import { resolverCicloInformado, periodoCobradoDentroDaVigencia } from "../lib/locacao/periodo-cobrado";
import { calcularAluguelProporcionalCompetencia, resolverVigenciaCobrancaPorCompetencia } from "../lib/locacao/financeiro";

test("criação de outubro usa o ciclo confirmado mesmo com cadastro por mês civil", () => {
  const periodos = [{
    id: "period", effectiveFrom: new Date("2025-10-23T12:00:00Z"),
    effectiveTo: new Date("2026-10-23T12:00:00Z"), rentAmount: 2700, paymentDueDay: 23,
  }];
  assert.equal(calcularAluguelProporcionalCompetencia(periodos, "2026-10", "Último dia do mês")?.valor, 2700);
  const ciclo = resolverCicloInformado({ startDate: "2026-09-23", endDate: "2026-10-22" });
  const vigencia = resolverVigenciaCobrancaPorCompetencia({
    periodos, competencia: "2026-10", competenciaCalculo: ciclo.competencia,
    diaVencimentoPadrao: 23, fimPeriodo: ciclo.fimPeriodo,
  });
  assert.equal(vigencia?.competencia, "2026-10");
  assert.equal(vigencia?.dataVencimento.toISOString(), "2026-10-23T00:00:00.000Z");
  assert.equal(vigencia?.periodo?.id, "period");
  const valor = calcularAluguelProporcionalCompetencia(periodos, ciclo.competencia, ciclo.fimPeriodo);
  assert.equal(valor?.valor, 2700);
  assert.equal(valor?.inicio.toISOString().slice(0, 10), "2026-09-23");
  assert.equal(valor?.fim.toISOString().slice(0, 10), "2026-10-22");
  assert.equal(periodoCobradoDentroDaVigencia({
    periodo: ciclo.periodo, inicioContrato: new Date("2025-10-23T00:00:00Z"),
    fimContrato: new Date("2026-10-22T00:00:00Z"), vencimento: vigencia!.dataVencimento,
  }), true);
});

test("não transforma período parcial ou inválido em aluguel mensal integral", () => {
  for (const periodo of [
    { startDate: "2026-10-01", endDate: "2026-10-22" },
    { startDate: "2026-09-23", endDate: "2026-10-23" },
    { startDate: "", endDate: "2026-10-22" },
    { startDate: "2026-01-31", endDate: "2026-01-31" },
  ]) assert.throws(() => resolverCicloInformado(periodo));
  assert.equal(resolverCicloInformado({ startDate: "2026-02-01", endDate: "2026-02-28" }).competencia, "2026-02");
});
