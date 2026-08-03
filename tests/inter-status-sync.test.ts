import test from "node:test";
import assert from "node:assert/strict";
import { executeInterStatusSyncQueue } from "../lib/inter-status-sync";

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
