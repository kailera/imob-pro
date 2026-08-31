import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { normalizarBuscaSemAcentos } from "../lib/financeiro/search-normalization.js";

const readSource = (relativePath: string) => readFileSync(
  fileURLToPath(new URL(relativePath, import.meta.url)),
  "utf8",
);

test("normaliza letras acentuadas e caixa na busca de cobranças", () => {
  assert.equal(normalizarBuscaSemAcentos(" Krísson "), "krisson");
  assert.equal(normalizarBuscaSemAcentos("KRISSON"), "krisson");
  assert.equal(normalizarBuscaSemAcentos("João Gonçalves"), "joao goncalves");
});

test("busca cobranças nos contratos legado e atual sem depender de acentos", () => {
  const route = readSource("../app/api/financeiro/transacoes/route.ts");

  assert.match(route, /translate\(lower\(COALESCE\(financial_transaction\.descricao/);
  assert.match(route, /legacy_tenant\.nome/);
  assert.match(route, /current_tenant\.name/);
  assert.match(route, /matchingTransactions\.map/);
  assert.doesNotMatch(route, /descricao: \{ contains: searchTerm/);
});
