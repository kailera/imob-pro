import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { countPendingContractUpdates } from "../lib/locacao/contract-updates.js";

const readSource = (relativePath: string) => readFileSync(
  fileURLToPath(new URL(relativePath, import.meta.url)),
  "utf8",
);

test("contador considera contratos pendentes únicos e ignora os tratados", () => {
  assert.equal(countPendingContractUpdates([
    { contratoId: "contrato-1", situacao: "ATRASADO" },
    { contratoId: "contrato-1", situacao: "REVISAR_HISTORICO" },
    { contratoId: "contrato-2", situacao: "A_VENCER" },
    { contratoId: "contrato-3", situacao: "TRATADO" },
  ]), 2);
});

test("agenda aparece somente na aba de atualizações e mantém histórico separado", () => {
  const container = readSource(
    "../app/(admin)/locacao/components/LocacaoClientContainer.tsx",
  );
  const agenda = readSource(
    "../app/(admin)/locacao/components/AgendaVencimentosLocacao.tsx",
  );

  assert.match(container, /Atualizações de contratos/);
  assert.match(container, /motion-safe:animate-pulse/);
  assert.match(container, /activeTab === 'atualizacoes'/);
  assert.doesNotMatch(container, /activeTab === 'contratos' && \(\s*<AgendaVencimentosLocacao/);
  assert.match(agenda, /Precisam de atualização/);
  assert.match(agenda, /Histórico corrigido/);
  assert.match(agenda, /eventosVisiveis\.map/);
});
