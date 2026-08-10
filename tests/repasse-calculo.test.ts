import test from "node:test";
import assert from "node:assert/strict";
import { calculateRepasse, resolveRepasseGrossValue } from "../lib/financeiro/repasse-calculo";

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
