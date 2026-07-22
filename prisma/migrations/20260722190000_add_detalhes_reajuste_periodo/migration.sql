ALTER TABLE "periodo_contrato_locacao"
ADD COLUMN "valorAluguelAnterior" DOUBLE PRECISION,
ADD COLUMN "percentualReajuste" DOUBLE PRECISION,
ADD COLUMN "reajusteAutomatico" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "dataCalculoReajuste" TIMESTAMP(3);
