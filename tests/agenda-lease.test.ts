import assert from "node:assert/strict";
import test from "node:test";
import { eventosLeaseNoMes, type LeaseAgendaInput } from "../lib/locacao/agenda-lease";

const data = (value: string) => new Date(`${value}T12:00:00Z`);
const contrato = (overrides: Partial<LeaseAgendaInput> = {}): LeaseAgendaInput => ({
  status: "ACTIVE", startDate: data("2025-10-01"), endDate: data("2028-09-30"),
  terms: { nextReadjustmentDate: null, readjustmentPeriodM: 12 },
  termsPeriods: [{ id: "base", effectiveFrom: data("2025-10-01"), effectiveTo: data("2026-10-01"), reviewStatus: "REVIEWED" }],
  ...overrides,
});

test("contrato atual entra em outubro sem depender de cadastro legado", () => {
  const [evento] = eventosLeaseNoMes(contrato(), 2026, 10);
  assert.equal(evento.data.toISOString().slice(0, 10), "2026-10-01");
  assert.equal(evento.tipo, "REAJUSTE_PERIODO");
  assert.equal(evento.revisar, false);
  assert.equal(eventosLeaseNoMes(contrato(), 2026, 9).length, 0);
});

test("período aberto importado conserva o próximo aniversário para revisão", () => {
  const lease = contrato({ startDate: data("2024-10-29"), endDate: data("2027-10-28"), termsPeriods: [
    { id: "base", effectiveFrom: data("2024-10-29"), effectiveTo: data("2025-10-29"), reviewStatus: "REVIEWED" },
    { id: "atual", effectiveFrom: data("2025-10-29"), effectiveTo: null, reviewStatus: "REVIEWED" },
  ] });
  const [evento] = eventosLeaseNoMes(lease, 2026, 10);
  assert.equal(evento.data.toISOString().slice(0, 10), "2026-10-29");
  assert.equal(evento.revisar, true);
  assert.equal(evento.sucessorId, undefined);
  assert.equal(eventosLeaseNoMes(lease, 2025, 10)[0].sucessorId, "atual");
});

test("fim do contrato impede reajuste posterior à vigência", () => {
  const eventos = eventosLeaseNoMes(contrato({ startDate: data("2025-10-23"), endDate: data("2026-10-22"), termsPeriods: [
    { id: "base", effectiveFrom: data("2025-10-23"), effectiveTo: data("2026-10-23"), reviewStatus: "REVIEWED" },
  ] }), 2026, 10);
  assert.deepEqual(eventos.map(e => e.tipo), ["VENCIMENTO_CONTRATO"]);
});

test("cadastro explícito prevalece sobre aniversário estimado", () => {
  const lease = contrato({ terms: { nextReadjustmentDate: data("2026-11-01"), readjustmentPeriodM: 12 },
    termsPeriods: [{ id: "base", effectiveFrom: data("2025-10-01"), effectiveTo: null, reviewStatus: "REVIEWED" }] });
  assert.equal(eventosLeaseNoMes(lease, 2026, 10).length, 0);
  assert.equal(eventosLeaseNoMes(lease, 2026, 11)[0].data.toISOString().slice(0, 10), "2026-11-01");
});

test("contratos inativos, rascunhos e sem vigência não entram na agenda", () => {
  for (const status of ["SUSPENDED", "TERMINATED", "CANCELLED", "DRAFT"]) {
    assert.equal(eventosLeaseNoMes(contrato({ status }), 2026, 10).length, 0);
  }
  assert.equal(eventosLeaseNoMes(contrato({ endDate: null }), 2026, 10).length, 0);
});

test("periodicidade e limite do mês são respeitados, sem avançar pendências antigas", () => {
  const lease = contrato({ terms: { nextReadjustmentDate: null, readjustmentPeriodM: 6 },
    termsPeriods: [{ id: "base", effectiveFrom: data("2026-04-30"), effectiveTo: null, reviewStatus: "REVIEWED" }] });
  assert.equal(eventosLeaseNoMes(lease, 2026, 10)[0].data.toISOString().slice(0, 10), "2026-10-30");
  assert.equal(eventosLeaseNoMes(lease, 2027, 10).length, 0);
});
