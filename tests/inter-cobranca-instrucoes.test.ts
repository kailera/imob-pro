import test from "node:test";
import assert from "node:assert/strict";
import {
  criarDescontoInterV3,
  criarInstrucoesBoletoInter,
  criarMensagemCobrancaInter,
  criarResumoComposicaoBoletoInter,
  resolverNumDiasAgendaInter,
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

test("gera mensagem final compatível com cinco linhas de até 78 caracteres", () => {
  const mensagem = criarMensagemCobrancaInter({
    metadata: { competence: "2026-08" },
    items: [
      { type: "RENT", description: "Aluguel", amount: 1_460, order: 0 },
      { type: "CONDOMINIUM", description: "Condomínio", amount: 320, order: 1 },
      { type: "IPTU", description: "IPTU", amount: 31.20, order: 2 },
      { type: "WATER", description: "Água", amount: 25, order: 3 },
      { type: "ENERGY", description: "Energia", amount: 80, order: 4 },
      { type: "GAS", description: "Gás", amount: 45, order: 5 },
      { type: "OTHER", description: "Seguro", amount: 15, order: 6 },
      { type: "DISCOUNT", description: "Desconto", amount: 100, order: 7 },
    ],
    valorNominal: 1_976.20,
    dataVencimento: "2026-08-30",
    desconto: criarDescontoInterV3({
      valor: 100,
      tipo: "FIXED",
      diasAntesDoVencimento: 1,
    }),
    multaPercentual: 2,
    jurosMensal: 1,
  });

  const linhas = Object.values(mensagem);
  assert.equal(linhas.length, 5);
  assert.ok(linhas.every(linha => linha.length <= 78));
  assert.match(linhas.join("\n"), /COMP 08\/2026/);
  assert.match(linhas.join("\n"), /COND RS 320,00/);
  assert.match(linhas.join("\n"), /desconto de RS 100,00/);
  assert.match(linhas.join("\n"), /Juros 1,00%/);
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

test("imprime a descrição do acordo manual nas linhas da cobrança", () => {
  const mensagem = criarMensagemCobrancaInter({
    metadata: {
      origin: "MANUAL_AGREEMENT",
      agreementDescription: "Parcelamento dos aluguéis de maio e junho",
      agreementLateFeePercentage: 10,
      agreementInterestMonthlyPercentage: 1,
    },
    valorNominal: 2_500,
    dataVencimento: "2026-08-30",
    multaPercentual: 10,
    jurosMensal: 1,
  });

  const linhas = Object.values(mensagem).join("\n");
  assert.match(linhas, /ACORDO: Parcelamento dos alugueis de maio e junho/);
  assert.match(linhas, /TOTAL NOMINAL: RS 2.500,00/);
  assert.match(linhas, /Apos o vencimento: multa de 10,00%. Juros 1,00% ao mes/);
});

test("remove a agenda adicional dos boletos de acordo", () => {
  assert.equal(resolverNumDiasAgendaInter({ origin: "MANUAL_AGREEMENT" }), 0);
  assert.equal(resolverNumDiasAgendaInter({ competence: "2026-08" }), 30);
  assert.equal(resolverNumDiasAgendaInter(null), 30);
});
