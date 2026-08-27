import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  getLegacyContractDeletionInfo,
  hasLegacyDocument,
} from "../lib/locacao/legacy-contract-deletion.js";

const readSource = (relativePath: string) => readFileSync(
  fileURLToPath(new URL(relativePath, import.meta.url)),
  "utf8",
);

test("permite excluir legado sem manutenção ou vistoria e preserva cobranças", () => {
  const result = getLegacyContractDeletionInfo({
    transactions: 4,
    maintenances: 0,
    inspectionLinks: 0,
    documents: 2,
  });

  assert.equal(result.canDelete, true);
  assert.equal(result.transactions, 4);
});

test("bloqueia exclusão quando o legado ainda sustenta histórico operacional", () => {
  const result = getLegacyContractDeletionInfo({
    transactions: 0,
    maintenances: 1,
    inspectionLinks: 2,
    documents: 0,
  });

  assert.equal(result.canDelete, false);
  assert.match(result.blockedReason ?? "", /manutenção/);
  assert.match(result.blockedReason ?? "", /vistoria/);
});

test("detecta documentos legados em listas e objetos JSON", () => {
  assert.equal(hasLegacyDocument([]), false);
  assert.equal(hasLegacyDocument({}), false);
  assert.equal(hasLegacyDocument([{ url: "documento.pdf" }]), true);
  assert.equal(hasLegacyDocument({ contrato: "documento.pdf" }), true);
});

test("lista oferece edição própria e exclusão autenticada para contratos legados", () => {
  const actionsComponent = readSource(
    "../app/(admin)/locacao/components/LegacyContractActions.tsx",
  );
  const deletionAction = readSource(
    "../app/(admin)/locacao/actions/deleteLegacyContrato.action.ts",
  );
  const listAction = readSource(
    "../app/(admin)/locacao/actions/actions.ts",
  );

  assert.match(actionsComponent, /\?edit=true/);
  assert.match(actionsComponent, /deleteLegacyContrato/);
  assert.match(deletionAction, /imobId: context\.tenantId/);
  assert.match(deletionAction, /data: \{ contratoId: null \}/);
  assert.match(listAction, /contratos\.map\(contrato =>/);
});
