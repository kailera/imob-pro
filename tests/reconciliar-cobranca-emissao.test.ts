import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { reconciliarCobrancaCanonicaAntesDaEmissao } from "../lib/locacao/reconciliarCobrancaAntesEmissao";
import { asMetadataRecord, atualizarMetadataComposicao } from "../lib/financeiro/boleto-composicao";
import { periodoCobradoDentroDaVigencia } from "../lib/locacao/periodo-cobrado";

test("última cobrança com período confirmado preserva valor, desconto e competência sem alterar contrato", async t => {
  const metadata = atualizarMetadataComposicao({ competence: "2026-10", termsPeriodId: "period" }, {
    rentValue: 2700, iptuValue: 0, condominiumValue: 0, waterValue: 0,
    electricityValue: 0, gasValue: 0, discountValue: 200, discountType: "FIXED",
    discountDaysBefore: 13, lateFeePercentage: 10, lateInterestMonthly: 1,
    dueDate: "2026-10-23", applyToContract: false,
    rentalPeriod: { startDate: "2026-09-23", endDate: "2026-10-22" },
  });
  const transaction = {
    id: "transaction", leaseId: "lease", categoria: "ALUGUEL", tipo: "RECEITA",
    status: "PENDENTE", valor: 2700, dataVencimento: new Date("2026-10-23T00:00:00Z"),
    metadata,
    lease: {
      status: "ACTIVE", startDate: new Date("2025-10-23T00:00:00Z"),
      endDate: new Date("2026-10-22T00:00:00Z"),
      terms: { firstPeriodEndDay: "Último dia do mês" },
    },
  };
  const originalFindUnique = prisma.transacaoFinanceira.findUnique;
  const originalTransaction = prisma.$transaction;
  prisma.transacaoFinanceira.findUnique = (async () => transaction) as unknown as typeof originalFindUnique;
  prisma.$transaction = (async () => { throw new Error("Não deve recalcular uma composição confirmada."); }) as typeof originalTransaction;
  t.after(() => {
    prisma.transacaoFinanceira.findUnique = originalFindUnique;
    prisma.$transaction = originalTransaction;
  });
  const snapshot = structuredClone(transaction);
  assert.deepEqual(await reconciliarCobrancaCanonicaAntesDaEmissao(transaction.id), { handled: true, updated: false });
  assert.deepEqual(transaction, snapshot);
  assert.equal(metadata.rentValue, 2700);
  assert.equal(metadata.billingConditions.discountValue, 200);
  assert.equal(asMetadataRecord(metadata).competence, "2026-10");
  assert.equal(periodoCobradoDentroDaVigencia({
    periodo: metadata.rentalPeriod,
    inicioContrato: transaction.lease.startDate,
    fimContrato: transaction.lease.endDate,
    vencimento: transaction.dataVencimento,
  }), true);
});

for (const { competence, final } of [
  { competence: "2026-10", final: false },
  { competence: "2026-09", final: false },
  { competence: null, final: false },
  { competence: "2026-10", final: true },
]) {
  test(`reconcilia outubro sem mover lançamentos entre competências (${competence}, ciclo final: ${final})`, async t => {
    const expectedCompetence = competence ?? "2026-09";
    const period = {
      id: "period", effectiveFrom: new Date("2026-01-01T00:00:00Z"), effectiveTo: new Date("2026-10-21T00:00:00Z"),
      paymentDueDay: 26, rentAmount: 1000, reviewStatus: "REVIEWED",
    };
    const adjustedPeriod = {
      ...period, id: "adjusted", effectiveFrom: period.effectiveTo,
      effectiveTo: null, rentAmount: 1200,
    };
    const transaction = {
      id: "transaction", leaseId: "lease", categoria: "ALUGUEL", tipo: "RECEITA",
      status: "PENDENTE", dataVencimento: new Date(final ? "2026-10-23T00:00:00Z" : "2026-10-26T00:00:00Z"),
      metadata: { ...(competence ? { competence } : {}), ...(final ? { rentalPeriod: { startDate: "2026-09-23", endDate: "2026-10-22" } } : {}) },
      lease: {
        id: "lease", status: "ACTIVE",
        startDate: final ? new Date("2025-10-23T00:00:00Z") : null,
        endDate: final ? new Date("2026-10-22T00:00:00Z") : null,
        termsPeriods: final ? [{ ...period, rentAmount: 2700, paymentDueDay: 23,
          effectiveFrom: new Date("2025-10-23T12:00:00Z"), effectiveTo: new Date("2026-10-23T12:00:00Z"),
          earlyPaymentDiscount: 200, discountType: "FIXED", discountDaysBefore: 13,
        }] : [period, adjustedPeriod],
        terms: { paymentDueDay: final ? 23 : 26, firstPeriodEndDay: final ? "Último dia do mês" : "Dia 20" },
        utilities: [], iptu: null, condominium: null, property: null,
      },
    };
    const charges = ["2026-09", "2026-10"].map(value => ({
      leaseId: "lease", competence: value, chargeType: "RENT", status: "PENDING",
      amount: 900,
    }));
    const before = structuredClone(charges);
    type TransactionData = { valor: number; metadata: { competence: string; termsPeriodId: string; rentalPeriod?: unknown; billingConditions: { discountValue: number; discountDaysBefore: number } }; dataVencimento: Date };
    type Charge = typeof charges[number];
    let saved: TransactionData | undefined;
    // Prisma delegates are proxies, so node:test cannot replace their methods
    // through property descriptors. Restore the delegate explicitly instead.
    const originalFindUnique = prisma.transacaoFinanceira.findUnique;
    prisma.transacaoFinanceira.findUnique = (async () => transaction) as unknown as typeof originalFindUnique;
    t.after(() => { prisma.transacaoFinanceira.findUnique = originalFindUnique; });
    const originalTransaction = prisma.$transaction;
    t.after(() => { prisma.$transaction = originalTransaction; });
    prisma.$transaction = (async (callback: (tx: unknown) => Promise<void>) => {
      await callback({
        transacaoFinanceira: { update: async ({ data }: { data: TransactionData }) => { saved = data; } },
        boletoChargeItem: { deleteMany: async () => ({}), createMany: async () => ({}) },
        leaseCharge: {
          updateMany: async ({ where, data }: { where: Partial<Charge>; data: Partial<Charge> }) => {
            const charge = charges.find(item => Object.entries(where).every(([key, value]) => item[key as keyof typeof item] === value));
            if (!charge) return { count: 0 };
            if (data.competence && charges.some(item => item !== charge && item.competence === data.competence)) {
              throw new Error("Unique constraint failed: leaseId, competence, chargeType");
            }
            Object.assign(charge, data);
            return { count: 1 };
          },
        },
      });
    }) as typeof originalTransaction;

    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await reconciliarCobrancaCanonicaAntesDaEmissao("transaction");
      assert.equal(result.updated, true);
    }
    assert.equal(saved?.metadata.competence, expectedCompetence);
    assert.equal(saved?.metadata.termsPeriodId, !final && expectedCompetence === "2026-10" ? "adjusted" : "period");
    assert.equal(saved?.dataVencimento.toISOString(), transaction.dataVencimento.toISOString());
    assert.equal(charges.find(item => item.competence === expectedCompetence)?.amount, final ? 2700 : expectedCompetence === "2026-10" ? 1200 : 1000);
    if (final) {
      assert.equal(saved?.valor, 2700);
      assert.equal(saved?.metadata.billingConditions.discountValue, 200);
      assert.equal(saved?.metadata.billingConditions.discountDaysBefore, 13);
      assert.deepEqual(saved?.metadata.rentalPeriod, transaction.metadata.rentalPeriod);
    }
    const other = before.find(item => item.competence !== expectedCompetence)!;
    assert.deepEqual(charges.find(item => item.competence === other.competence), other);
  });
}
