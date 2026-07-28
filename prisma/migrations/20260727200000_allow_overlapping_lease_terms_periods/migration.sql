-- Períodos são registros históricos. Permitir a repetição da mesma data
-- inicial e a sobreposição preserva correções e alterações posteriores.
DROP INDEX IF EXISTS "lease_terms_period_leaseId_effectiveFrom_key";

-- A referência vigente considera o registro criado mais recentemente.
CREATE INDEX IF NOT EXISTS "lease_terms_period_leaseId_createdAt_idx"
  ON "lease_terms_period"("leaseId", "createdAt");
