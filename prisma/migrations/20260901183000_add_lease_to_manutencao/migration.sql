-- Manutenções antigas continuam vinculadas ao contrato legado. Novas
-- manutenções também podem apontar diretamente para o modelo canônico Lease.
ALTER TABLE "manutencao"
  ALTER COLUMN "contratoId" DROP NOT NULL,
  ADD COLUMN "leaseId" TEXT;

CREATE INDEX "manutencao_leaseId_idx" ON "manutencao"("leaseId");

ALTER TABLE "manutencao"
  ADD CONSTRAINT "manutencao_leaseId_fkey"
  FOREIGN KEY ("leaseId") REFERENCES "lease"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "manutencao"
  ADD CONSTRAINT "manutencao_contrato_or_lease_check"
  CHECK (num_nonnulls("contratoId", "leaseId") = 1);
