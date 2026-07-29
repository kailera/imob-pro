import test from "node:test";
import assert from "node:assert/strict";
import {
  atualizarMetadataComposicao,
  asMetadataRecord,
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

test("calcula desconto fixo e percentual somente sobre o aluguel", () => {
  assert.equal(calcularDescontoEfetivo(1_000, 100, "FIXED"), 100);
  assert.equal(calcularDescontoEfetivo(1_000, 9.26, "PERCENT"), 92.60);
});

test("salva e recupera a fotografia das condições do boleto, inclusive valores zero", () => {
  const metadata = atualizarMetadataComposicao({ competence: "2026-09" }, {
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
