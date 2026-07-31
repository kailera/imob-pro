import test from "node:test";
import assert from "node:assert/strict";
import { criarDescontoInterV3, criarMoraInterV3 } from "../lib/inter-cobranca";

test("monta bonificação fixa no contrato da API V3 do Inter", () => {
  assert.deepEqual(criarDescontoInterV3({
    valor: 100,
    tipo: "VALOR",
    diasAntesDoVencimento: 1,
  }), {
    codigo: "VALORFIXODATAINFORMADA",
    quantidadeDias: 1,
    valor: 100,
  });
});

test("monta bonificação percentual no contrato da API V3 do Inter", () => {
  assert.deepEqual(criarDescontoInterV3({
    valor: 10,
    tipo: "PERCENTUAL",
    diasAntesDoVencimento: 2,
  }), {
    codigo: "PERCENTUALDATAINFORMADA",
    quantidadeDias: 2,
    taxa: 10,
  });
});

test("usa o código de taxa mensal vigente para a mora da API V3", () => {
  assert.deepEqual(criarMoraInterV3(1), {
    codigo: "TAXAMENSAL",
    taxa: 1,
  });
  assert.equal(criarMoraInterV3(0), undefined);
});
