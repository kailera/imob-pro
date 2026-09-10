import assert from "node:assert/strict";
import test from "node:test";
import { mergeTenantOptions } from "../lib/vistorias/tenant-options";

test("inclui todos os inquilinos novos sem limitar a quantidade", () => {
  const persons = Array.from({ length: 350 }, (_, index) => ({
    id: `person-${index}`, name: `Inquilino ${index}`, cpfCnpj: String(index + 1),
    email: null, phones: [{ phone: "18999999999" }],
  }));
  const result = mergeTenantOptions([
    { id: "legacy", nome: "José", cpfCnpj: "9999", email: "", telefone: null },
  ], persons);
  assert.equal(result.length, 351);
  assert.ok(result.some((tenant) => tenant.id === "person-349"));
  assert.deepEqual(result.find((tenant) => tenant.id === "person-0")?.telefone, [{ numero: "18999999999" }]);
});

test("preserva o ID vinculado quando a mesma pessoa existe nas duas bases", () => {
  const legacy = { id: "legacy", nome: "João", cpfCnpj: "123.456.789-00", email: "", telefone: null };
  assert.deepEqual(mergeTenantOptions([legacy], [
    { id: "person", name: "João", cpfCnpj: "12345678900", email: null, phones: [] },
  ]), [legacy]);
});

test("não exclui pessoas diferentes sem documento ou com o mesmo nome", () => {
  const result = mergeTenantOptions([], [
    { id: "a", name: "Maria", cpfCnpj: "", email: null, phones: [] },
    { id: "b", name: "Maria", cpfCnpj: "", email: null, phones: [] },
  ]);
  assert.equal(result.length, 2);
});
