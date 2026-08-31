export type InterBatchOperation = "EMIT" | "SYNC";

export type InterBatchTaskStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "PARTIAL"
  | "FAILED";

export type InterBatchTaskDto = {
  id: string;
  operation: InterBatchOperation;
  name: string;
  status: InterBatchTaskStatus;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  progress: number;
  summaryMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export const ACTIVE_INTER_BATCH_STATUSES: InterBatchTaskStatus[] = [
  "QUEUED",
  "RUNNING",
];

export function interBatchTaskName(operation: InterBatchOperation) {
  return operation === "EMIT"
    ? "Geração automática de boletos"
    : "Atualização dos status dos boletos";
}

export function resolveInterBatchTerminalStatus(succeeded: number, failed: number) {
  if (failed === 0) return "SUCCEEDED" as const;
  if (succeeded === 0) return "FAILED" as const;
  return "PARTIAL" as const;
}
