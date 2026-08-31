import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { executeInterStatusSyncQueue } from "../lib/inter-status-sync";
import { resolveInterTransactionTenantId } from "../lib/inter-tenant";

const readSource = (relativePath: string) => readFileSync(
  fileURLToPath(new URL(relativePath, import.meta.url)),
  "utf8",
);

test("processa a fila sequencialmente e resume pagamentos, cancelamentos e falhas", async () => {
  const order: string[] = [];
  const waits: number[] = [];
  const responses = new Map([
    ["tx-1", { success: true, status: "RECEBIDO" }],
    ["tx-2", { success: true, status: "CANCELADO" }],
    ["tx-3", { success: false, error: "timeout" }],
  ]);

  const report = await executeInterStatusSyncQueue({
    transactionIds: ["tx-1", "tx-2", "tx-3"],
    intervalMs: 6_500,
    synchronize: async transactionId => {
      order.push(transactionId);
      return responses.get(transactionId) ?? { success: false, error: "ausente" };
    },
    sleep: async milliseconds => {
      waits.push(milliseconds);
    },
  });

  assert.deepEqual(order, ["tx-1", "tx-2", "tx-3"]);
  assert.deepEqual(waits, [6_500, 6_500]);
  assert.equal(report.selected, 3);
  assert.equal(report.synchronized, 2);
  assert.equal(report.paid, 1);
  assert.equal(report.canceled, 1);
  assert.equal(report.failed, 1);
});

test("isola exceções de um boleto e continua processando os demais", async () => {
  const report = await executeInterStatusSyncQueue({
    transactionIds: ["tx-com-erro", "tx-ok"],
    intervalMs: 0,
    synchronize: async transactionId => {
      if (transactionId === "tx-com-erro") throw new Error("Inter indisponível");
      return { success: true, status: "A_RECEBER" };
    },
  });

  assert.equal(report.failed, 1);
  assert.equal(report.synchronized, 1);
  assert.match(report.items[0].error ?? "", /Inter indisponível/);
});

test("resolve as credenciais do Inter pelo contrato atual, legado ou imóvel", () => {
  assert.equal(resolveInterTransactionTenantId({
    contrato: null,
    lease: { tenantId: "imob-canonica" },
  }), "imob-canonica");
  assert.equal(resolveInterTransactionTenantId({
    contrato: { imobId: "imob-legada" },
    lease: { tenantId: "imob-canonica" },
  }), "imob-legada");
  assert.equal(resolveInterTransactionTenantId({
    imovel: { imobId: "imob-do-imovel" },
  }), "imob-do-imovel");
  assert.equal(resolveInterTransactionTenantId({}), null);
});

test("cron aceita GET e POST autenticados e consulta o tenant da lease", () => {
  const route = readSource("../app/api/inter/cobrancas/sync/route.ts");
  const inter = readSource("../lib/inter.ts");

  assert.match(route, /export async function GET/);
  assert.match(route, /export async function POST/);
  assert.match(route, /Authorization: Bearer <CRON_SECRET>/);
  assert.match(inter, /lease: \{ select: \{ tenantId: true \} \}/);
  assert.match(inter, /resolveInterTransactionTenantId\(transacao\)/);
});

test("tela enfileira os dois lotes com intervalo seguro e seleção autenticada", () => {
  const page = readSource("../app/(admin)/cobrancas/page.tsx");
  const actions = readSource("../app/actions/interActions.ts");
  const candidates = readSource("../lib/inter-batch-candidates.ts");
  const tasks = readSource("../lib/inter-batch-tasks.ts");

  assert.match(page, /Atualizar status dos boletos/);
  assert.match(page, /Gerar boletos automaticamente/);
  assert.match(page, /startTask\('SYNC'\)/);
  assert.match(page, /startTask\('EMIT'\)/);
  assert.match(candidates, /DEFAULT_INTERVAL_MS = 6_500/);
  assert.match(tasks, /listInterBatchCandidates/);
  assert.match(actions, /requireInterTransactionAccess\(transacaoId\)/);
  assert.match(actions, /interTransactionTenantScope\(context\.tenantId\)/);
});
