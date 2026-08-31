CREATE TYPE "InterBatchOperation" AS ENUM ('EMIT', 'SYNC');
CREATE TYPE "InterBatchTaskStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED');
CREATE TYPE "InterBatchItemStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

ALTER TABLE "transacao_financeira"
  ADD COLUMN "interEmissionLockId" TEXT,
  ADD COLUMN "interEmissionLockedAt" TIMESTAMP(3);

CREATE TABLE "inter_batch_task" (
  "id" TEXT NOT NULL,
  "imobId" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "operation" "InterBatchOperation" NOT NULL,
  "isScheduled" BOOLEAN NOT NULL DEFAULT false,
  "status" "InterBatchTaskStatus" NOT NULL DEFAULT 'QUEUED',
  "total" INTEGER NOT NULL DEFAULT 0,
  "processed" INTEGER NOT NULL DEFAULT 0,
  "succeeded" INTEGER NOT NULL DEFAULT 0,
  "failed" INTEGER NOT NULL DEFAULT 0,
  "intervalMs" INTEGER NOT NULL DEFAULT 6500,
  "nextProcessAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "summaryMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "dismissedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inter_batch_task_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inter_batch_task_item" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "transacaoId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "status" "InterBatchItemStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseOwner" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "lastError" TEXT,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inter_batch_task_item_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inter_batch_task_imobId_status_createdAt_idx"
  ON "inter_batch_task"("imobId", "status", "createdAt");
CREATE INDEX "inter_batch_task_status_nextProcessAt_idx"
  ON "inter_batch_task"("status", "nextProcessAt");
CREATE UNIQUE INDEX "inter_batch_task_one_active_per_imob_idx"
  ON "inter_batch_task"("imobId")
  WHERE "status" IN ('QUEUED', 'RUNNING');

CREATE UNIQUE INDEX "inter_batch_task_item_taskId_transacaoId_key"
  ON "inter_batch_task_item"("taskId", "transacaoId");
CREATE INDEX "inter_batch_task_item_status_nextAttemptAt_idx"
  ON "inter_batch_task_item"("status", "nextAttemptAt");
CREATE INDEX "inter_batch_task_item_leaseExpiresAt_idx"
  ON "inter_batch_task_item"("leaseExpiresAt");

ALTER TABLE "inter_batch_task"
  ADD CONSTRAINT "inter_batch_task_imobId_fkey"
  FOREIGN KEY ("imobId") REFERENCES "imob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inter_batch_task"
  ADD CONSTRAINT "inter_batch_task_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inter_batch_task_item"
  ADD CONSTRAINT "inter_batch_task_item_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "inter_batch_task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
