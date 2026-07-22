ALTER TABLE "imovel_locacao"
ADD COLUMN "historicoPeriodosStatus" TEXT NOT NULL DEFAULT 'NAO_INICIADO',
ADD COLUMN "historicoRevisadoEm" TIMESTAMP(3);

ALTER TABLE "periodo_contrato_locacao"
ADD COLUMN "tipoPeriodo" TEXT NOT NULL DEFAULT 'REAJUSTE',
ADD COLUMN "origemPeriodo" TEXT NOT NULL DEFAULT 'MANUAL';

-- Dados preexistentes nao sao considerados completos sem revisao humana.
UPDATE "imovel_locacao" locacao
SET "historicoPeriodosStatus" = CASE
  WHEN EXISTS (
    SELECT 1
    FROM "periodo_contrato_locacao" periodo
    WHERE periodo."imovelLocacaoId" = locacao."id"
  ) THEN 'PARCIAL'
  ELSE 'NAO_INICIADO'
END;

-- O primeiro registro de cada locacao representa a base, ainda que provisoria.
WITH primeiros AS (
  SELECT DISTINCT ON ("imovelLocacaoId") "id"
  FROM "periodo_contrato_locacao"
  ORDER BY "imovelLocacaoId", "dataInicio" ASC, "createdAt" ASC
)
UPDATE "periodo_contrato_locacao" periodo
SET "tipoPeriodo" = 'BASE'
FROM primeiros
WHERE periodo."id" = primeiros."id";

-- Periodos que ocupam toda a vigencia sao os placeholders gerados na importacao antiga.
UPDATE "periodo_contrato_locacao" periodo
SET "origemPeriodo" = 'SICADI_PROVISORIO'
FROM "imovel_locacao" locacao
WHERE periodo."imovelLocacaoId" = locacao."id"
  AND periodo."dataInicio" = locacao."dataInicio"
  AND periodo."dataFim" = locacao."dataFim"
  AND locacao."periodicidadeReajuste" IS NOT NULL
  AND locacao."periodicidadeReajuste" > 0
  AND locacao."dataFim" > locacao."dataInicio" + (locacao."periodicidadeReajuste" || ' months')::interval;

CREATE INDEX "periodo_contrato_locacao_dataFim_idx"
ON "periodo_contrato_locacao"("dataFim");

CREATE INDEX "periodo_contrato_locacao_imovelLocacaoId_dataInicio_dataFim_idx"
ON "periodo_contrato_locacao"("imovelLocacaoId", "dataInicio", "dataFim");
