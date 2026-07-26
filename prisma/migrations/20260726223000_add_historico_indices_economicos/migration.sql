CREATE TABLE "indice_economico_valor" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "competencia" TIMESTAMP(3) NOT NULL,
    "taxaMensal" DECIMAL(12,8) NOT NULL,
    "fonte" TEXT NOT NULL DEFAULT 'BCB_SGS',
    "consultadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indice_economico_valor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "indice_economico_valor_codigo_competencia_key"
ON "indice_economico_valor"("codigo", "competencia");

CREATE INDEX "indice_economico_valor_competencia_idx"
ON "indice_economico_valor"("competencia");

ALTER TABLE "lease_terms"
ALTER COLUMN "readjustmentIndex" SET DEFAULT 'IGP-M';
