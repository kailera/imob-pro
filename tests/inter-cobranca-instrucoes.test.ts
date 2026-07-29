import test from "node:test";
import assert from "node:assert/strict";
import {
  criarDescontoInterV3,
  criarInstrucoesBoletoInter,
  criarResumoComposicaoBoletoInter,
} from "../lib/inter-cobranca";

test("cria instrucoes compreensiveis de bonificacao e multa para o boleto", () => {
  assert.deepEqual(criarInstrucoesBoletoInter({
    desconto: criarDescontoInterV3({ valor: 100, tipo: "VALOR", diasAntesDoVencimento: 1 }),
    multaPercentual: 10,
    dataVencimento: "2027-08-27",
  }), [
    "Pagamento com desconto de R$ 100,00 ate dia 26/08/2027.",
    "Apos o vencimento: multa de 10,00%.",
  ]);
});

test("inclui juros junto das condições de atraso", () => {
  assert.deepEqual(criarInstrucoesBoletoInter({
    multaPercentual: 2,
    jurosMensal: 1,
    dataVencimento: "2026-09-09",
  }), [
    "Apos o vencimento: multa de 2,00%. Juros 1,00% ao mes, pro rata dia.",
  ]);
});

test("resume condomínio e gás na mensagem impressa do boleto", () => {
  assert.deepEqual(criarResumoComposicaoBoletoInter({
    metadata: {
      competence: "2026-08",
      rentValue: 1_000,
      condominiumValue: 40,
      gasValue: 35,
      iptuValue: 0,
      waterValue: 0,
      electricityValue: 0,
    },
    valorNominal: 1_075,
    dataVencimento: "2026-09-09",
  }), [
    "REF: ALUGUEL - COMP 08/2026 - VENC 09/09/2026",
    "COMPOSICAO: ALUG RS 1.000,00; COND RS 40,00; GAS RS 35,00; TOTAL RS 1.075,00",
  ]);
});
