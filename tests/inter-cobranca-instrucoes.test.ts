import test from "node:test";
import assert from "node:assert/strict";
import { criarDescontoInterV3, criarInstrucoesBoletoInter } from "../lib/inter-cobranca";

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
