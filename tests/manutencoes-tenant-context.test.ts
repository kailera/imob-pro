import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (relativePath: string) => readFileSync(
  new URL(relativePath, import.meta.url),
  "utf8",
);

test("manutenções usam a imobiliária vinculada ao usuário", () => {
  const actions = readSource("../app/(admin)/manutencoes/actions.tsx");

  assert.match(actions, /const context = await requireUserContext\(\)/);
  assert.match(actions, /return context\.tenantId/);
  assert.doesNotMatch(actions, /findUnique\(\{ where: \{ orgId \}/);
});

test("documentos de manutenção respeitam o mesmo contexto do usuário", () => {
  const route = readSource("../app/api/manutencoes/documentos/[documentoId]/route.ts");

  assert.match(route, /const userContext = await requireUserContext\(\)/);
  assert.match(route, /imobId = userContext\.tenantId/);
  assert.match(route, /manutencao: \{ imobId \}/);
  assert.doesNotMatch(route, /findUnique\(\{ where: \{ orgId \}/);
});
