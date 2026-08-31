import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  contractOverlapsFinancePeriod,
  getCalendarDayStartInTimeZone,
  getFinanceMetricMonthRange,
} from "../lib/financeiro/period-metrics.js";

const readSource = (relativePath: string) => readFileSync(
  fileURLToPath(new URL(relativePath, import.meta.url)),
  "utf8",
);

test("cria intervalo mensal UTC semiaberto para as métricas", () => {
  const range = getFinanceMetricMonthRange("2026-08");
  assert.ok(range);
  assert.equal(range.start.toISOString(), "2026-08-01T00:00:00.000Z");
  assert.equal(range.endExclusive.toISOString(), "2026-09-01T00:00:00.000Z");
});

test("rejeita períodos fora do formato AAAA-MM", () => {
  assert.equal(getFinanceMetricMonthRange("08/2026"), null);
  assert.equal(getFinanceMetricMonthRange("2026-13"), null);
});

test("considera ativo o contrato cuja vigência cruza qualquer parte do mês", () => {
  const range = getFinanceMetricMonthRange("2026-08");
  assert.ok(range);
  assert.equal(contractOverlapsFinancePeriod("2026-07-15", "2026-08-01", range), true);
  assert.equal(contractOverlapsFinancePeriod("2026-08-31", "2027-08-30", range), true);
  assert.equal(contractOverlapsFinancePeriod("2026-07-01", "2026-07-31", range), false);
});

test("calcula o início do dia pelo calendário de São Paulo", () => {
  assert.equal(
    getCalendarDayStartInTimeZone(new Date("2026-09-01T01:30:00.000Z")).toISOString(),
    "2026-08-31T00:00:00.000Z",
  );
});

test("rota limita métricas à imobiliária e usa as datas corretas do período", () => {
  const route = readSource("../app/api/financeiro/metricas/route.ts");
  const financePage = readSource("../app/(admin)/financeiro/page.tsx");
  const chargesPage = readSource("../app/(admin)/cobrancas/page.tsx");

  assert.match(route, /requireUserContext/);
  assert.match(route, /imobId: context\.tenantId/);
  assert.match(route, /tenantId: context\.tenantId/);
  assert.match(route, /dataVencimento/);
  assert.match(route, /dataPagamento/);
  assert.match(route, /interDataRecebimento/);
  assert.match(route, /chargesWithoutBill/);
  assert.match(route, /overdueBills/);
  assert.match(route, /status: "PENDENTE"/);
  assert.match(financePage, /api\/financeiro\/metricas\?month=/);
  assert.match(financePage, /FinancialPeriodMetrics/);
  assert.match(chargesPage, /api\/financeiro\/metricas\?month=/);
  assert.match(chargesPage, /FinancialPeriodMetrics/);
  assert.match(chargesPage, /layout="grid"/);
  assert.match(chargesPage, /onNavigate=\{handleMetricNavigation\}/);
  assert.match(chargesPage, /status: target === 'WITHOUT_BILL' \? 'Sem boleto' : 'Em atraso'/);
});

test("cobranças combinam mês de referência e busca com atualização automática", () => {
  const route = readSource("../app/api/financeiro/transacoes/route.ts");
  const chargesPage = readSource("../app/(admin)/cobrancas/page.tsx");

  assert.match(route, /searchParams\.get\('referenceMonth'\)/);
  assert.match(route, /getFinanceMetricMonthRange\(referenceMonth\)/);
  assert.match(route, /where\.dataVencimento = \{/);
  assert.match(route, /lt: referenceMonthRange\.endExclusive/);
  assert.match(chargesPage, /params\.set\('referenceMonth', filters\.mesReferencia\)/);
  assert.match(chargesPage, /setAppliedSearch\(filters\.search\)/);
  assert.match(chargesPage, /\[appliedSearch, filters\.mesReferencia, refreshFromFirstPage\]/);
});
