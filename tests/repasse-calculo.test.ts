import test from "node:test";
import assert from "node:assert/strict";
import { calculateRepasse, resolveRepasseGrossValue } from "../lib/financeiro/repasse-calculo";
import { groupRepassesByOwner } from "../lib/financeiro/repasse-grouping";
import type { RepasseItem } from "../lib/financeiro/repasse-types";

function repasseItem(key: string, ownerId: string, values: Partial<RepasseItem> = {}): RepasseItem {
  return {
    key,
    leaseId: `lease-${key}`,
    legacyContractId: null,
    rentTransactionId: `rent-${key}`,
    repasseId: null,
    competence: "2026-08",
    contractCode: `contract-${key}`,
    owner: { id: ownerId, name: "Humberto Franzotti", cpfCnpj: "00000000000", participation: null, bankName: null, bankAgency: null, bankAccount: null, pixKey: null },
    additionalOwners: [],
    tenantNames: [],
    propertyId: `property-${key}`,
    propertyCode: `IMB-${key}`,
    propertyTitle: `Imóvel ${key}`,
    propertyAddress: "Ilha Solteira/SP",
    rentValue: 1_000,
    grossValue: 1_000,
    receivedAt: null,
    adminFeePercent: 10,
    adminFeeValue: 100,
    deductions: [],
    otherDeductions: [],
    deductionTotal: 0,
    netValue: 900,
    transferDueDate: null,
    paidAt: null,
    status: "AGUARDANDO_RECEBIMENTO",
    ...values,
  };
}

test("agrupa os imóveis do mesmo proprietário e consolida os totais", () => {
  const groups = groupRepassesByOwner([
    repasseItem("00003", "owner-1"),
    repasseItem("00006", "owner-1", { grossValue: 1_100, adminFeeValue: 110, deductionTotal: 50, netValue: 940, receivedAt: "2026-08-10" }),
    repasseItem("00008", "owner-2"),
  ]);

  assert.equal(groups.length, 2);
  assert.equal(groups[0].items.length, 2);
  assert.equal(groups[0].grossTotal, 2_100);
  assert.equal(groups[0].adminFeeTotal, 210);
  assert.equal(groups[0].deductionTotal, 50);
  assert.equal(groups[0].netTotal, 1_840);
  assert.equal(groups[0].receivedCount, 1);
});

test("usa o aluguel contratual na projeção enquanto o boleto não foi recebido", () => {
  assert.equal(resolveRepasseGrossValue({
    rentValue: 978.12,
    transactionValue: 0,
    receivedValue: null,
    isReceived: false,
  }), 978.12);
});

test("usa o valor efetivamente recebido após a liquidação", () => {
  assert.equal(resolveRepasseGrossValue({
    rentValue: 1_000,
    transactionValue: 1_000,
    receivedValue: 1_035.50,
    isReceived: true,
  }), 1_035.50);
});

test("calcula repasse com taxa administrativa, manutenção e outros descontos", () => {
  const result = calculateRepasse({
    grossValue: 5_500,
    rentValue: 5_500,
    adminFeePercent: 10,
    deductionValues: [109],
    otherDeductionValues: [],
  });

  assert.deepEqual(result, {
    grossValue: 5_500,
    adminFeePercent: 10,
    adminFeeValue: 550,
    deductionTotal: 109,
    netValue: 4_841,
  });
});

test("aplica taxa apenas sobre o aluguel contratual quando o bruto contém encargos", () => {
  const result = calculateRepasse({
    grossValue: 2_100,
    rentValue: 2_000,
    adminFeePercent: 10,
    deductionValues: [50],
    otherDeductionValues: [25],
  });

  assert.equal(result.adminFeeValue, 200);
  assert.equal(result.deductionTotal, 75);
  assert.equal(result.netValue, 1_825);
});

test("nunca gera valor líquido negativo", () => {
  const result = calculateRepasse({
    grossValue: 500,
    rentValue: 500,
    adminFeePercent: 10,
    deductionValues: [700],
    otherDeductionValues: [],
  });

  assert.equal(result.netValue, 0);
});
