ALTER TABLE "imovel_locacao"
ADD COLUMN "honorariosAdvPercentual" DOUBLE PRECISION,
ADD COLUMN "carenciaHonorariosDias" INTEGER,
ADD COLUMN "periodoGarantido" TEXT,
ADD COLUMN "abrangenciaGarantia" TEXT,
ADD COLUMN "diaVencimento" INTEGER,
ADD COLUMN "vencimentoOrigem" TEXT NOT NULL DEFAULT 'NAO_DEFINIDO',
ADD COLUMN "multaQuebraPercentual" DOUBLE PRECISION,
ADD COLUMN "multaQuebraProporcional" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "periodo_contrato_locacao"
ADD COLUMN "diaVencimento" INTEGER;

ALTER TABLE "imovel_locacao"
ADD CONSTRAINT "imovel_locacao_diaVencimento_check"
CHECK ("diaVencimento" IS NULL OR "diaVencimento" BETWEEN 1 AND 31),
ADD CONSTRAINT "imovel_locacao_multaQuebraPercentual_check"
CHECK ("multaQuebraPercentual" IS NULL OR "multaQuebraPercentual" >= 0);

ALTER TABLE "periodo_contrato_locacao"
ADD CONSTRAINT "periodo_contrato_locacao_diaVencimento_check"
CHECK ("diaVencimento" IS NULL OR "diaVencimento" BETWEEN 1 AND 31);

UPDATE "imovel_locacao"
SET "multaQuebraPercentual" = "multaQuebraContrato"
WHERE "tipoMultaQuebra" = 'PERCENTUAL'
  AND "multaQuebraContrato" IS NOT NULL;

WITH dias_por_locacao AS (
  SELECT
    contrato."imovelLocacaoId" AS locacao_id,
    MIN(EXTRACT(DAY FROM transacao."dataVencimento"))::INTEGER AS dia,
    COUNT(DISTINCT EXTRACT(DAY FROM transacao."dataVencimento")) AS quantidade_dias
  FROM "contrato_imovel_locacao" contrato
  JOIN "transacao_financeira" transacao ON transacao."contratoId" = contrato."id"
  WHERE transacao."categoria" = 'ALUGUEL'
    AND contrato."imovelLocacaoId" IS NOT NULL
  GROUP BY contrato."imovelLocacaoId"
)
UPDATE "imovel_locacao" locacao
SET
  "diaVencimento" = CASE WHEN dias.quantidade_dias = 1 THEN dias.dia ELSE NULL END,
  "vencimentoOrigem" = CASE WHEN dias.quantidade_dias = 1 THEN 'INFERIDO_COBRANCAS' ELSE 'DIVERGENTE' END
FROM dias_por_locacao dias
WHERE locacao."id" = dias.locacao_id;

UPDATE "periodo_contrato_locacao" periodo
SET "diaVencimento" = locacao."diaVencimento"
FROM "imovel_locacao" locacao
WHERE periodo."imovelLocacaoId" = locacao."id";

CREATE TABLE "parcela_intermediacao" (
  "id" TEXT NOT NULL,
  "imovelLocacaoId" TEXT NOT NULL,
  "ordem" INTEGER NOT NULL,
  "dataVencimento" TIMESTAMP(3) NOT NULL,
  "valor" DOUBLE PRECISION NOT NULL,
  "observacao" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "parcela_intermediacao_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "parcela_intermediacao_imovelLocacaoId_ordem_key"
ON "parcela_intermediacao"("imovelLocacaoId", "ordem");

CREATE INDEX "parcela_intermediacao_imovelLocacaoId_dataVencimento_idx"
ON "parcela_intermediacao"("imovelLocacaoId", "dataVencimento");

ALTER TABLE "parcela_intermediacao"
ADD CONSTRAINT "parcela_intermediacao_imovelLocacaoId_fkey"
FOREIGN KEY ("imovelLocacaoId") REFERENCES "imovel_locacao"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
