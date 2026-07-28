import assert from "node:assert/strict";
import test from "node:test";
import { calcularCondominioDaCobranca } from "../lib/locacao/condominio";

test("inclui o condomínio mensal quando o locatário é responsável", () => {
  assert.equal(calcularCondominioDaCobranca({
    amount: "40.00",
    responsibleParty: "Locatário",
  }), 40);
});

test("não cobra condomínio do inquilino quando o locador é responsável", () => {
  assert.equal(calcularCondominioDaCobranca({
    amount: 40,
    responsibleParty: "Locador",
  }), 0);
});

test("ignora valores ausentes, inválidos ou não positivos", () => {
  assert.equal(calcularCondominioDaCobranca(null), 0);
  assert.equal(calcularCondominioDaCobranca({ amount: -10, responsibleParty: null }), 0);
  assert.equal(calcularCondominioDaCobranca({ amount: "inválido", responsibleParty: null }), 0);
});
