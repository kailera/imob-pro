import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  interBatchIntervalMs,
  interTransactionTenantScope,
  listInterBatchCandidates,
} from "@/lib/inter-batch-candidates";
import {
  interBatchTaskName,
  resolveInterBatchTerminalStatus,
  type InterBatchOperation,
  type InterBatchTaskDto,
} from "@/lib/inter-batch-task-types";
import { cobrancaEstaRegistradaNoInter } from "@/lib/inter-cobranca";
import { consultarBolePixAction, gerarBolePixAction } from "@/lib/inter";

const ACTIVE_STATUSES = ["QUEUED", "RUNNING"] as const;
const TERMINAL_STATUSES = ["SUCCEEDED", "PARTIAL", "FAILED"] as const;
const ITEM_LEASE_MS = 15 * 60 * 1_000;
const RECENT_TASK_WINDOW_MS = 24 * 60 * 60 * 1_000;

type TaskForDto = {
  id: string;
  operation: InterBatchOperation;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "PARTIAL" | "FAILED";
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  summaryMessage: string | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
};

export function toInterBatchTaskDto(task: TaskForDto): InterBatchTaskDto {
  return {
    id: task.id,
    operation: task.operation,
    name: interBatchTaskName(task.operation),
    status: task.status,
    total: task.total,
    processed: task.processed,
    succeeded: task.succeeded,
    failed: task.failed,
    progress: task.total > 0
      ? Math.min(100, Math.round((task.processed / task.total) * 100))
      : 100,
    summaryMessage: task.summaryMessage,
    createdAt: task.createdAt.toISOString(),
    startedAt: task.startedAt?.toISOString() ?? null,
    finishedAt: task.finishedAt?.toISOString() ?? null,
  };
}

function sanitizeTaskError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "Erro inesperado.");
  return message.replace(/\s+/g, " ").trim().slice(0, 500);
}

async function findActiveTask(tenantId: string) {
  return prisma.interBatchTask.findFirst({
    where: {
      imobId: tenantId,
      status: { in: [...ACTIVE_STATUSES] },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function createInterBatchTask(input: {
  tenantId: string;
  createdByUserId: string | null;
  operation: InterBatchOperation;
  isScheduled?: boolean;
}) {
  try {
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`inter-batch:${input.tenantId}`}))`;

      const activeTask = await tx.interBatchTask.findFirst({
        where: {
          imobId: input.tenantId,
          status: { in: [...ACTIVE_STATUSES] },
        },
        orderBy: { createdAt: "asc" },
      });
      if (activeTask) {
        return { created: false as const, task: activeTask };
      }

      const candidates = await listInterBatchCandidates(
        input.tenantId,
        input.operation,
        tx,
      );
      const now = new Date();
      const task = await tx.interBatchTask.create({
        data: {
          imobId: input.tenantId,
          createdByUserId: input.createdByUserId,
          operation: input.operation,
          isScheduled: Boolean(input.isScheduled),
          status: candidates.length === 0 ? "SUCCEEDED" : "QUEUED",
          total: candidates.length,
          processed: candidates.length === 0 ? 0 : undefined,
          intervalMs: interBatchIntervalMs(),
          finishedAt: candidates.length === 0 ? now : null,
          summaryMessage: candidates.length === 0
            ? input.operation === "EMIT"
              ? "Não há cobranças pendentes disponíveis para emissão."
              : "Todos os boletos elegíveis já estão atualizados."
            : null,
          items: candidates.length > 0
            ? {
                createMany: {
                  data: candidates.map(candidate => ({
                    transacaoId: candidate.id,
                    label: candidate.label,
                  })),
                },
              }
            : undefined,
        },
      });

      return { created: true as const, task };
    });
    return result;
  } catch (error) {
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2002") {
      const activeTask = await findActiveTask(input.tenantId);
      if (activeTask) return { created: false as const, task: activeTask };
    }
    throw error;
  }
}

export async function listVisibleInterBatchTasks(tenantId: string) {
  const recentSince = new Date(Date.now() - RECENT_TASK_WINDOW_MS);
  const tasks = await prisma.interBatchTask.findMany({
    where: {
      imobId: tenantId,
      dismissedAt: null,
      OR: [
        { status: { in: [...ACTIVE_STATUSES] } },
        {
          status: { in: [...TERMINAL_STATUSES] },
          finishedAt: { gte: recentSince },
          OR: [
            { isScheduled: false },
            { total: { gt: 0 } },
          ],
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  return tasks.map(toInterBatchTaskDto);
}

export async function dismissInterBatchTask(tenantId: string, taskId: string) {
  const result = await prisma.interBatchTask.updateMany({
    where: {
      id: taskId,
      imobId: tenantId,
      status: { in: [...TERMINAL_STATUSES] },
    },
    data: { dismissedAt: new Date() },
  });
  return result.count === 1;
}

type ClaimedItem = {
  itemId: string;
  taskId: string;
  tenantId: string;
  operation: InterBatchOperation;
  transacaoId: string;
  leaseOwner: string;
  intervalMs: number;
};

async function claimNextItem(workerId: string): Promise<ClaimedItem | null> {
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + ITEM_LEASE_MS);

  return prisma.$transaction(async tx => {
    await tx.interBatchTaskItem.updateMany({
      where: {
        status: "RUNNING",
        leaseExpiresAt: { lt: now },
      },
      data: {
        status: "PENDING",
        leaseOwner: null,
        leaseExpiresAt: null,
        nextAttemptAt: now,
      },
    });

    const task = await tx.interBatchTask.findFirst({
      where: {
        status: { in: [...ACTIVE_STATUSES] },
        nextProcessAt: { lte: now },
        items: {
          some: {
            status: "PENDING",
            nextAttemptAt: { lte: now },
          },
        },
      },
      orderBy: [{ nextProcessAt: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        imobId: true,
        operation: true,
        intervalMs: true,
        startedAt: true,
      },
    });
    if (!task) return null;

    const item = await tx.interBatchTaskItem.findFirst({
      where: {
        taskId: task.id,
        status: "PENDING",
        nextAttemptAt: { lte: now },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, transacaoId: true },
    });
    if (!item) return null;

    const claimed = await tx.interBatchTaskItem.updateMany({
      where: { id: item.id, status: "PENDING" },
      data: {
        status: "RUNNING",
        attempts: { increment: 1 },
        leaseOwner: workerId,
        leaseExpiresAt,
        startedAt: now,
      },
    });
    if (claimed.count !== 1) return null;

    await tx.interBatchTask.update({
      where: { id: task.id },
      data: {
        status: "RUNNING",
        startedAt: task.startedAt ?? now,
      },
    });

    return {
      itemId: item.id,
      taskId: task.id,
      tenantId: task.imobId,
      operation: task.operation,
      transacaoId: item.transacaoId,
      leaseOwner: workerId,
      intervalMs: task.intervalMs,
    };
  });
}

async function transactionBelongsToTenant(transacaoId: string, tenantId: string) {
  return prisma.transacaoFinanceira.findFirst({
    where: {
      id: transacaoId,
      ...interTransactionTenantScope(tenantId),
    },
    select: {
      id: true,
      interCodigoSolicitacao: true,
      interNossoNumero: true,
      interTxId: true,
      interBarcode: true,
    },
  });
}

async function executeClaimedItem(item: ClaimedItem) {
  const transaction = await transactionBelongsToTenant(
    item.transacaoId,
    item.tenantId,
  );
  if (!transaction) {
    return { success: false, error: "Cobrança não encontrada para esta imobiliária." };
  }

  if (item.operation === "EMIT" && cobrancaEstaRegistradaNoInter(transaction)) {
    return { success: true };
  }

  const result = item.operation === "SYNC"
    ? await consultarBolePixAction(item.transacaoId)
    : await gerarBolePixAction(item.transacaoId, {
        expectedTenantId: item.tenantId,
        emissionOwner: `batch:${item.taskId}:${item.itemId}`,
      });

  if (!result.success && item.operation === "EMIT") {
    const afterAttempt = await transactionBelongsToTenant(
      item.transacaoId,
      item.tenantId,
    );
    if (afterAttempt && cobrancaEstaRegistradaNoInter(afterAttempt)) {
      return { success: true };
    }
  }

  return {
    success: result.success,
    error: result.success ? undefined : result.error,
  };
}

async function finishClaimedItem(
  item: ClaimedItem,
  result: { success: boolean; error?: string },
) {
  const now = new Date();
  return prisma.$transaction(async tx => {
    const finished = await tx.interBatchTaskItem.updateMany({
      where: {
        id: item.itemId,
        status: "RUNNING",
        leaseOwner: item.leaseOwner,
      },
      data: {
        status: result.success ? "SUCCEEDED" : "FAILED",
        lastError: result.success ? null : sanitizeTaskError(result.error),
        leaseOwner: null,
        leaseExpiresAt: null,
        finishedAt: now,
      },
    });
    if (finished.count !== 1) return null;

    const task = await tx.interBatchTask.update({
      where: { id: item.taskId },
      data: {
        processed: { increment: 1 },
        succeeded: result.success ? { increment: 1 } : undefined,
        failed: result.success ? undefined : { increment: 1 },
        nextProcessAt: new Date(now.getTime() + item.intervalMs),
      },
    });

    if (task.processed < task.total) return task;

    const status = resolveInterBatchTerminalStatus(task.succeeded, task.failed);
    return tx.interBatchTask.update({
      where: { id: task.id },
      data: {
        status,
        finishedAt: now,
        summaryMessage: task.failed === 0
          ? `${task.succeeded} cobrança(s) processada(s) com sucesso.`
          : `${task.succeeded} sucesso(s) e ${task.failed} falha(s).`,
      },
    });
  });
}

export async function processNextInterBatchItem(workerId: string = randomUUID()) {
  const item = await claimNextItem(workerId);
  if (!item) return null;

  let result: { success: boolean; error?: string };
  try {
    result = await executeClaimedItem(item);
  } catch (error) {
    result = { success: false, error: sanitizeTaskError(error) };
  }

  const task = await finishClaimedItem(item, result);
  console.info("[inter-batch-worker] Item processado", {
    taskId: item.taskId,
    itemId: item.itemId,
    operation: item.operation,
    success: result.success,
  });
  return task ? toInterBatchTaskDto(task) : null;
}

export async function enqueueScheduledInterSyncTasks() {
  const configuration = await prisma.configuracaoInter.findUnique({
    where: { singletonKey: "global" },
    select: { id: true },
  });
  if (!configuration) return [];

  const tenants = await prisma.imob.findMany({
    select: { id: true },
  });
  const results = [];
  for (const tenant of tenants) {
    try {
      const result = await createInterBatchTask({
        tenantId: tenant.id,
        createdByUserId: null,
        operation: "SYNC",
        isScheduled: true,
      });
      results.push({
        tenantId: tenant.id,
        taskId: result.task.id,
        created: result.created,
        total: result.task.total,
      });
    } catch (error) {
      results.push({
        tenantId: tenant.id,
        error: sanitizeTaskError(error),
      });
    }
  }
  return results;
}

export type CreateInterBatchTaskResult = Awaited<ReturnType<typeof createInterBatchTask>>;
export type InterBatchTaskDatabaseInput = Prisma.InterBatchTaskCreateInput;
