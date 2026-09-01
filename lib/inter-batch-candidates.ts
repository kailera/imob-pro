import "server-only";

import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import type { InterBatchOperation } from "@/lib/inter-batch-task-types";

const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 100;
const DEFAULT_INTERVAL_MS = 6_500;

type DatabaseClient = typeof prisma | Prisma.TransactionClient;

function readBoundedPositiveInteger(
  value: string | undefined,
  fallback: number,
  maximum: number,
) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

export function interTransactionTenantScope(
  tenantId: string,
): Prisma.TransacaoFinanceiraWhereInput {
  return {
    OR: [
      { contrato: { imobId: tenantId } },
      { lease: { tenantId } },
      { imovel: { imobId: tenantId } },
      { metadata: { path: ["imobId"], equals: tenantId } },
    ],
  };
}

export function interBatchIntervalMs() {
  return readBoundedPositiveInteger(
    process.env.INTER_BATCH_INTERVAL_MS,
    DEFAULT_INTERVAL_MS,
    60_000,
  );
}

export async function listInterBatchCandidates(
  tenantId: string,
  operation: InterBatchOperation,
  db: DatabaseClient = prisma,
) {
  const batchSize = readBoundedPositiveInteger(
    process.env.INTER_BATCH_SIZE,
    DEFAULT_BATCH_SIZE,
    MAX_BATCH_SIZE,
  );
  const lockExpiredBefore = new Date(Date.now() - 15 * 60 * 1_000);
  const operationFilter: Prisma.TransacaoFinanceiraWhereInput = operation === "SYNC"
    ? {
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
      }
    : {
        interCodigoSolicitacao: null,
        interNossoNumero: null,
        interTxId: null,
        interBarcode: null,
        OR: [
          { interEmissionLockId: null },
          { interEmissionLockedAt: { lt: lockExpiredBefore } },
        ],
      };
  const activeContractFilter: Prisma.TransacaoFinanceiraWhereInput = operation === "EMIT"
    ? {
        OR: [
          { lease: { is: { status: "ACTIVE" } } },
          { leaseId: null },
        ],
      }
    : {};

  const transactions = await db.transacaoFinanceira.findMany({
    where: {
      AND: [
        interTransactionTenantScope(tenantId),
        operationFilter,
        activeContractFilter,
      ],
      tipo: "RECEITA",
      categoria: "ALUGUEL",
      status: "PENDENTE",
    },
    orderBy: [{ dataVencimento: "asc" }, { createdAt: "asc" }],
    take: batchSize,
    select: { id: true, descricao: true },
  });

  return transactions.map(transaction => ({
    id: transaction.id,
    label: transaction.descricao.replace("Aluguel - ", ""),
  }));
}
