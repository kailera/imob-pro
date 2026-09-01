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

test("manutenções aceitam contratos ativos do modelo canônico Lease", () => {
  const actions = readSource("../app/(admin)/manutencoes/actions.tsx");
  const schema = readSource("../prisma/schema.prisma");
  const migration = readSource(
    "../prisma/migrations/20260901183000_add_lease_to_manutencao/migration.sql",
  );

  assert.match(actions, /prisma\.lease\.findMany\(\{/);
  assert.match(actions, /tenantId: imobId, status: "ACTIVE"/);
  assert.match(actions, /role: \{ in: \["TENANT", "CO_TENANT", "LANDLORD"\] \}/);
  assert.match(actions, /leaseId: lease\.id/);
  assert.match(actions, /contratoId: null/);

  assert.match(schema, /contratoId\s+String\?/);
  assert.match(schema, /leaseId\s+String\?/);
  assert.match(schema, /lease\s+Lease\?/);
  assert.match(migration, /num_nonnulls\("contratoId", "leaseId"\) = 1/);
});
