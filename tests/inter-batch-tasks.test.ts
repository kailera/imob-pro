import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  interBatchTaskName,
  resolveInterBatchTerminalStatus,
} from "../lib/inter-batch-task-types.js";

const readSource = (relativePath: string) => readFileSync(
  fileURLToPath(new URL(relativePath, import.meta.url)),
  "utf8",
);

test("resolve os estados terminais e os nomes das tarefas", () => {
  assert.equal(resolveInterBatchTerminalStatus(5, 0), "SUCCEEDED");
  assert.equal(resolveInterBatchTerminalStatus(0, 5), "FAILED");
  assert.equal(resolveInterBatchTerminalStatus(4, 1), "PARTIAL");
  assert.equal(interBatchTaskName("EMIT"), "Geração automática de boletos");
  assert.equal(interBatchTaskName("SYNC"), "Atualização dos status dos boletos");
});

test("fila persiste, serializa por tenant e recupera leases expiradas", () => {
  const service = readSource("../lib/inter-batch-tasks.ts");
  const migration = readSource("../prisma/migrations/20260831140000_add_inter_batch_tasks/migration.sql");

  assert.match(service, /pg_advisory_xact_lock/);
  assert.match(service, /interTransactionTenantScope\(tenantId\)/);
  assert.match(service, /leaseExpiresAt: \{ lt: now \}/);
  assert.match(service, /status: "PENDING"/);
  assert.match(service, /expectedTenantId: item\.tenantId/);
  assert.match(service, /marcarEmissaoInterComoPendente/);
  assert.match(service, /boleto\(s\) emitido\(s\).*pendente\(s\)/);
  assert.match(migration, /CREATE UNIQUE INDEX "inter_batch_task_one_active_per_imob_idx"/);
  assert.match(migration, /WHERE "status" IN \('QUEUED', 'RUNNING'\)/);
});

test("API é autenticada e worker interno exige segredo", () => {
  const tasksRoute = readSource("../app/api/inter/tasks/route.ts");
  const workerRoute = readSource("../app/api/internal/inter/tasks/process/route.ts");

  assert.match(tasksRoute, /requireUserContext/);
  assert.match(tasksRoute, /context\.tenantId/);
  assert.match(tasksRoute, /status: 409/);
  assert.match(workerRoute, /process\.env\.CRON_SECRET/);
  assert.match(workerRoute, /authorization/);
  assert.match(workerRoute, /processNextInterBatchItem/);
});

test("painel global substitui a modal e o Docker executa o worker", () => {
  const layout = readSource("../app/(admin)/layout.tsx");
  const page = readSource("../app/(admin)/cobrancas/page.tsx");
  const provider = readSource("../components/cobrancas/InterBatchTaskProvider.tsx");
  const compose = readSource("../docker-compose.yml");

  assert.match(layout, /InterBatchTaskProvider/);
  assert.match(page, /startTask\('EMIT'\)/);
  assert.match(page, /startTask\('SYNC'\)/);
  assert.doesNotMatch(page, /showBatchModal/);
  assert.match(provider, /fixed left-4 top-24/);
  assert.match(provider, /role="progressbar"/);
  assert.match(provider, /Concluída com boletos pendentes/);
  assert.match(compose, /inter-batch-worker:/);
  assert.match(compose, /api\/internal\/inter\/tasks\/process/);
});
