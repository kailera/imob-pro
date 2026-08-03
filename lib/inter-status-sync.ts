import { prisma } from "@/lib/prisma";
import { consultarBolePixAction } from "@/lib/inter";

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_INTERVAL_MS = 6_500;
const MAX_BATCH_SIZE = 500;

export type InterStatusSyncItem = {
  transacaoId: string;
  success: boolean;
  status?: string;
  error?: string;
};

export type InterStatusSyncReport = {
  startedAt: string;
  finishedAt: string;
  selected: number;
  synchronized: number;
  paid: number;
  canceled: number;
  failed: number;
  items: InterStatusSyncItem[];
};

export class InterStatusSyncAlreadyRunningError extends Error {
  constructor() {
    super("Uma sincronização de cobranças do Banco Inter já está em andamento.");
    this.name = "InterStatusSyncAlreadyRunningError";
  }
}

function readBoundedInteger(value: string | undefined, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export async function executeInterStatusSyncQueue(input: {
  transactionIds: string[];
  intervalMs: number;
  synchronize: (transactionId: string) => Promise<{
    success: boolean;
    status?: string;
    error?: string;
  }>;
  sleep?: (milliseconds: number) => Promise<void>;
}): Promise<InterStatusSyncReport> {
  const startedAt = new Date();
  const items: InterStatusSyncItem[] = [];
  const sleep = input.sleep ?? (milliseconds =>
    new Promise(resolve => setTimeout(resolve, milliseconds)));

  for (let index = 0; index < input.transactionIds.length; index += 1) {
    const transacaoId = input.transactionIds[index];
    try {
      const result = await input.synchronize(transacaoId);
      items.push({ transacaoId, ...result });
    } catch (error) {
      items.push({
        transacaoId,
        success: false,
        error: error instanceof Error ? error.message : "Erro inesperado na sincronização.",
      });
    }

    if (index < input.transactionIds.length - 1 && input.intervalMs > 0) {
      await sleep(input.intervalMs);
    }
  }

  return {
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    selected: input.transactionIds.length,
    synchronized: items.filter(item => item.success).length,
    paid: items.filter(item => item.success && ["RECEBIDO", "PAGO"].includes(item.status ?? "")).length,
    canceled: items.filter(item => item.success && ["CANCELADO", "EXPIRADO"].includes(item.status ?? "")).length,
    failed: items.filter(item => !item.success).length,
    items,
  };
}

let runningSynchronization: Promise<InterStatusSyncReport> | null = null;

/**
 * Reconcilia cobranças pendentes que possuem codigoSolicitacao no Banco Inter.
 * O webhook continua sendo o caminho em tempo real; esta rotina cobre callbacks perdidos.
 */
export async function synchronizePendingInterCharges(): Promise<InterStatusSyncReport> {
  if (runningSynchronization) throw new InterStatusSyncAlreadyRunningError();

  const batchSize = readBoundedInteger(
    process.env.INTER_STATUS_SYNC_BATCH_SIZE,
    DEFAULT_BATCH_SIZE,
    MAX_BATCH_SIZE,
  );
  const intervalMs = readBoundedInteger(
    process.env.INTER_STATUS_SYNC_INTERVAL_MS,
    DEFAULT_INTERVAL_MS,
    60_000,
  );

  runningSynchronization = (async () => {
    const transactions = await prisma.transacaoFinanceira.findMany({
      where: {
        status: "PENDENTE",
        interCodigoSolicitacao: { not: null },
        OR: [
          { interStatus: null },
          {
            interStatus: {
              notIn: [
                "RECEBIDO",
                "PAGO",
                "CANCELADO",
                "EXPIRADO",
                "FALHA_EMISSAO",
                "MARCADO_RECEBIDO",
              ],
            },
          },
        ],
      },
      orderBy: { updatedAt: "asc" },
      take: batchSize,
      select: { id: true },
    });

    return executeInterStatusSyncQueue({
      transactionIds: transactions.map(transaction => transaction.id),
      intervalMs,
      synchronize: consultarBolePixAction,
    });
  })();

  try {
    return await runningSynchronization;
  } finally {
    runningSynchronization = null;
  }
}
