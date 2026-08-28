import test from "node:test";
import assert from "node:assert/strict";
import {
  atualizarMetadataComposicao,
  asMetadataRecord,
  calcularEncargosReemissaoVencida,
  calcularDescontoEfetivo,
  calcularTotalNominal,
  criarItensCobranca,
  lerCondicoesBoletoMetadata,
} from "../lib/financeiro/boleto-composicao";

test("soma todos os componentes que formam o valor nominal enviado ao Inter", () => {
  assert.equal(calcularTotalNominal({
    rentValue: 1_000,
    iptuValue: 31.20,
    condominiumValue: 40,
    waterValue: 25.50,
    electricityValue: 80,
    gasValue: 35,
    otherValue: 15,
  }), 1_226.70);
});

test("persiste itens positivos e desconto sem reduzir o valor nominal", () => {
  const items = criarItensCobranca({
    rentValue: 1_000,
    iptuValue: 31.20,
    condominiumValue: 40,
    waterValue: 0,
    electricityValue: 0,
    gasValue: 35,
    otherValue: 15,
    otherDescription: "Seguro",
  }, {
    discountValue: 10,
    discountType: "PERCENT",
  });

  assert.deepEqual(items.map(item => [item.type, item.description, item.amount]), [
    ["RENT", "Aluguel", 1_000],
    ["CONDOMINIUM", "Condomínio", 40],
    ["IPTU", "IPTU", 31.20],
    ["GAS", "Gás", 35],
    ["OTHER", "Seguro", 15],
    ["DISCOUNT", "Desconto de pontualidade", 100],
  ]);
});

test("mantém multa e juros acumulados como itens separados da composição", () => {
  const items = criarItensCobranca({
    rentValue: 1_000,
    iptuValue: 0,
    condominiumValue: 0,
    waterValue: 0,
    electricityValue: 0,
    gasValue: 0,
    lateFeeAmount: 100,
    lateInterestAmount: 2.67,
  });

  assert.equal(calcularTotalNominal({
    rentValue: 1_000,
    iptuValue: 0,
    condominiumValue: 0,
    waterValue: 0,
    electricityValue: 0,
    gasValue: 0,
    lateFeeAmount: 100,
    lateInterestAmount: 2.67,
  }), 1_102.67);
  assert.deepEqual(items.map(item => [item.type, item.amount]), [
    ["RENT", 1_000],
    ["LATE_FEE", 100],
    ["LATE_INTEREST", 2.67],
  ]);
});

test("calcula desconto fixo e percentual somente sobre o aluguel", () => {
  assert.equal(calcularDescontoEfetivo(1_000, 100, "FIXED"), 100);
  assert.equal(calcularDescontoEfetivo(1_000, 9.26, "PERCENT"), 92.60);
});

test("calcula multa única e juros mensais proporcionais para a reemissão", () => {
  assert.deepEqual(calcularEncargosReemissaoVencida({
    baseAmount: 1_000,
    originalDueDate: "2026-08-20",
    calculationDate: "2026-08-28",
    lateFeePercentage: 10,
    lateInterestMonthly: 1,
  }), {
    daysLate: 8,
    lateFeeAmount: 100,
    lateInterestAmount: 2.67,
    updatedTotal: 1_102.67,
  });
});

test("não aplica encargos quando a data de cálculo não passou do vencimento", () => {
  assert.deepEqual(calcularEncargosReemissaoVencida({
    baseAmount: 1_000,
    originalDueDate: "2026-08-28",
    calculationDate: "2026-08-28",
    lateFeePercentage: 10,
    lateInterestMonthly: 1,
  }), {
    daysLate: 0,
    lateFeeAmount: 0,
    lateInterestAmount: 0,
    updatedTotal: 1_000,
  });
});

test("salva e recupera a fotografia das condições do boleto, inclusive valores zero", () => {
  const metadata = atualizarMetadataComposicao({ competence: "2026-09" }, {
    dueDate: "2026-09-10",
    rentValue: 1_000,
    iptuValue: 31.20,
    condominiumValue: 0,
    waterValue: 0,
    electricityValue: 0,
    gasValue: 0,
    discountValue: 100,
    discountType: "FIXED",
    discountDaysBefore: 15,
    lateFeePercentage: 2,
    lateInterestMonthly: 1,
    applyToContract: false,
  });

  assert.equal(asMetadataRecord(metadata).competence, "2026-09");
  assert.equal(asMetadataRecord(metadata).gasValue, 0);
  assert.deepEqual(lerCondicoesBoletoMetadata(metadata), {
    discountValue: 100,
    discountType: "FIXED",
    discountDaysBefore: 15,
    lateFeePercentage: 2,
    lateInterestMonthly: 1,
  });
});
