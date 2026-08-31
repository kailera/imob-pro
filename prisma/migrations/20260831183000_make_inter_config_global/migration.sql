-- A instalação usa uma única integração com o Banco Inter. Caso uma base antiga
-- contenha mais de uma configuração, preserva a alteração mais recente.
DELETE FROM "configuracao_inter"
WHERE "id" NOT IN (
  SELECT "id"
  FROM "configuracao_inter"
  ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
  LIMIT 1
);

ALTER TABLE "configuracao_inter"
ADD COLUMN "singletonKey" TEXT NOT NULL DEFAULT 'global';

CREATE UNIQUE INDEX "configuracao_inter_singletonKey_key"
ON "configuracao_inter"("singletonKey");

ALTER TABLE "configuracao_inter"
DROP CONSTRAINT IF EXISTS "configuracao_inter_imobId_fkey";

DROP INDEX IF EXISTS "configuracao_inter_imobId_key";

ALTER TABLE "configuracao_inter"
DROP COLUMN "imobId";
