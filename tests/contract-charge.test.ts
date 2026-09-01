import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  listarPendenciasInter,
  resolverEnderecoPagadorInter,
} from "../lib/locacao/inter-readiness";

const readSource = (relativePath: string) => readFileSync(
  fileURLToPath(new URL(relativePath, import.meta.url)),
  "utf8",
);

const property = {
  cep: 15385000,
  logradouro: "Rua do imóvel",
  bairro: "Centro",
  cidade: "Ilha Solteira",
  uf: "SP",
};

test("lista CPF inválido sem criar uma cobrança incompleta", () => {
  const issues = listarPendenciasInter({
    tenant: {
      nome: "Natalia",
      cpfCnpj: "123.456.789-01",
      address: null,
    },
    property,
  });

  assert.ok(issues.some(item => item.code === "TENANT_DOCUMENT_INVALID"));
  assert.ok(!issues.some(item => item.code === "PAYER_STREET_REQUIRED"));
});

test("usa o endereço válido do imóvel quando o inquilino não possui endereço", () => {
  const address = resolverEnderecoPagadorInter({ tenantAddress: null, property });
  assert.equal(address.source, "IMOVEL");
  assert.equal(address.logradouro, "Rua do imóvel");
  assert.equal(address.cep, "15385000");

  assert.deepEqual(listarPendenciasInter({
    tenant: {
      nome: "Pagador válido",
      cpfCnpj: "52998224725",
      address: null,
    },
    property,
  }), []);
});

test("ação por contrato é autenticada e preserva outras competências", () => {
  const action = readSource("../app/actions/contractChargeActions.ts");
  const modal = readSource("../components/locacao/ContractChargesModal.tsx");
  const contractQuery = readSource("../app/(admin)/locacao/actions/getContratoForEdit.ts");

  assert.match(action, /requireUserContext\(\)/);
  assert.match(action, /obterCompetenciaEfetiva\(transaction\) === competence/);
  assert.match(action, /leaseId_competence_chargeType/);
  assert.match(modal, /type="month"/);
  assert.match(modal, /Corrigir dados do contrato/);
  assert.match(contractQuery, /legacyTransactions/);
  assert.match(contractQuery, /\.\.\.lease\.transacoes, \.\.\.legacyTransactions/);
});

test("geração mensal tem unicidade por contrato e competência", () => {
  const monthlyAction = readSource("../app/actions/financeiroActions.ts");
  const contractAction = readSource("../app/actions/contractChargeActions.ts");
  const schema = readSource("../prisma/schema.prisma");
  const migration = readSource(
    "../prisma/migrations/20260831194500_add_monthly_billing_key/migration.sql",
  );

  assert.match(schema, /billingKey\s+String\?\s+@unique/);
  assert.match(migration, /CREATE UNIQUE INDEX "transacao_financeira_billingKey_key"/);
  assert.match(monthlyAction, /transacaoFinanceira\.upsert\(\{\s*where: \{ billingKey \}/);
  assert.match(contractAction, /transacaoFinanceira\.upsert\(\{\s*where: \{ billingKey \}/);
});
