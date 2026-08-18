import test from "node:test";
import assert from "node:assert/strict";
import { calculateRepasse, resolveRepasseGrossValue } from "../lib/financeiro/repasse-calculo";
import { groupRepassesByOwner } from "../lib/financeiro/repasse-grouping";
import { createRepasseXlsx } from "../lib/financeiro/repasse-xlsx";
import { resolveRepasseBonus, restoreGrossBeforeBonus } from "../lib/financeiro/repasse-bonificacao";
import { buildResidentialRepasseReports } from "../lib/financeiro/repasse-residencial";
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
    residential: null,
    rentValue: 1_000,
    chargeTotal: 0,
    grossValue: 1_000,
    receivedAt: null,
    adminFeePercent: 10,
    adminFeeValue: 100,
    deductions: [],
    otherDeductions: [],
    otherAdditions: [],
    additionTotal: 0,
    deductionTotal: 0,
    netValue: 900,
    transferDueDate: null,
    paidAt: null,
    status: "AGUARDANDO_RECEBIMENTO",
    operations: [],
    ...values,
  };
}

test("agrupa os imóveis do mesmo proprietário e consolida os totais", () => {
  const groups = groupRepassesByOwner([
    repasseItem("00003", "owner-1"),
    repasseItem("00006", "owner-1", { grossValue: 1_100, adminFeeValue: 110, additionTotal: 25, deductionTotal: 50, netValue: 965, receivedAt: "2026-08-10" }),
    repasseItem("00008", "owner-2"),
  ]);

  assert.equal(groups.length, 2);
  assert.equal(groups[0].items.length, 2);
  assert.equal(groups[0].grossTotal, 2_100);
  assert.equal(groups[0].adminFeeTotal, 210);
  assert.equal(groups[0].additionTotal, 25);
  assert.equal(groups[0].deductionTotal, 50);
  assert.equal(groups[0].netTotal, 1_865);
  assert.equal(groups[0].receivedCount, 1);
});

test("consolida imóveis e operações por residencial sem perder os repasses individuais", () => {
  const items = [
    repasseItem("00003", "owner-1", {
      residential: { id: "res-1", name: "Agatha" },
      chargeTotal: 80,
      operations: [{ id: "rent-1", type: "ALUGUEL", description: "Aluguel recebido", date: "2026-08-10", value: 1_000, direction: "CREDITO", propertyId: "property-00003", propertyCode: "IMB-00003" }],
    }),
    repasseItem("00006", "owner-1", {
      residential: { id: "res-1", name: "Agatha" },
      rentValue: 1_100,
      grossValue: 1_100,
      netValue: 990,
      adminFeeValue: 110,
    }),
  ];
  const reports = buildResidentialRepasseReports(items, [{
    id: "maintenance-1", residencialId: "res-1", propertyId: null, propertyCode: null,
    description: "Limpeza da área comum", date: "2026-08-15", value: 200, allocationType: "NAO_RATEAR",
  }]);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].propertyCount, 2);
  assert.equal(reports[0].rentTotal, 2_100);
  assert.equal(reports[0].chargeTotal, 80);
  assert.equal(reports[0].netRepasseTotal, 1_890);
  assert.equal(reports[0].maintenanceTotal, 200);
  assert.equal(reports[0].globalResult, 1_690);
  assert.equal(reports[0].operations.length, 2);
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
    additionTotal: 0,
    deductionTotal: 109,
    netValue: 4_841,
  });
});

test("soma acréscimos ao valor líquido do proprietário", () => {
  const result = calculateRepasse({
    grossValue: 1_000,
    rentValue: 1_000,
    adminFeePercent: 10,
    deductionValues: [50],
    otherDeductionValues: [],
    additionValues: [25, 10],
  });

  assert.equal(result.additionTotal, 35);
  assert.equal(result.netValue, 885);
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

test("gera planilha XLSX válida com os repasses da competência", () => {
  const file = createRepasseXlsx([repasseItem("00003", "owner-1")], {
    name: "Scatolin Imóveis",
    legalName: null,
    cnpj: null,
    creci: null,
    phone: null,
    email: null,
    logoUrl: null,
    address: "",
  }, "2026-08");

  assert.deepEqual(Array.from(file.slice(0, 4)), [0x50, 0x4b, 0x03, 0x04]);
  const content = new TextDecoder().decode(file);
  assert.match(content, /xl\/worksheets\/sheet1\.xml/);
  assert.match(content, /Humberto Franzotti/);
  assert.match(content, /TOTAL DA COMPETÊNCIA/);
});

test("resolve a bonificação salva no boleto e recompõe o bruto recebido sem duplicar o desconto", () => {
  const bonus = resolveRepasseBonus({
    transactionId: "rent-1",
    rentValue: 1_000,
    metadata: {},
    chargeItems: [{ type: "DISCOUNT", description: "Desconto de pontualidade", amount: 100 }],
  });

  assert.deepEqual(bonus, {
    id: "bonificacao:rent-1",
    type: "BONIFICACAO",
    description: "Desconto de pontualidade",
    value: 100,
  });
  assert.equal(restoreGrossBeforeBonus({
    grossValue: 900,
    transactionValue: 1_000,
    bonusValue: 100,
    isReceived: true,
  }), 1_000);
});

test("calcula bonificação percentual pelas condições da cobrança quando não há item persistido", () => {
  const bonus = resolveRepasseBonus({
    transactionId: "rent-2",
    rentValue: 1_200,
    metadata: { billingConditions: { discountValue: 10, discountType: "PERCENT" } },
    chargeItems: [],
  });

  assert.equal(bonus?.value, 120);
});
