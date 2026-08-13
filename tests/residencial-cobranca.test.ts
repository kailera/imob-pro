import test from "node:test";
import assert from "node:assert/strict";
import { resolverDespesasResidencial } from "../lib/residenciais/cobranca";

test("despesas vigentes do residencial entram na cobrança e água/IPTU não são categorias possíveis", () => {
  const result = resolverDespesasResidencial([
    { id: "internet", nome: "Internet", categoria: "INTERNET", valor: 80, ativo: true, inicioVigencia: new Date("2026-01-01"), fimVigencia: null },
    { id: "limpeza", nome: "Limpeza", categoria: "LIMPEZA", valor: 40, ativo: true, inicioVigencia: new Date("2026-09-01"), fimVigencia: null },
  ], new Date("2026-08-01"), 0);
  assert.equal(result.additionalTotal, 80);
  assert.deepEqual(result.residentialExpenses.map(item => item.id), ["internet"]);
});

test("gás do residencial sobrescreve o gás da locação sem duplicar o item", () => {
  const result = resolverDespesasResidencial([
    { id: "gas", nome: "Gás coletivo", categoria: "GAS", valor: 55, ativo: true, inicioVigencia: new Date("2026-01-01"), fimVigencia: null },
  ], new Date("2026-08-01"), 30);
  assert.equal(result.gasValue, 55);
  assert.equal(result.gasOverridden, true);
  assert.equal(result.additionalTotal, 0);
});
