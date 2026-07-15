-- AlterTable
ALTER TABLE "imovel_locacao" ALTER COLUMN "valorAluguel" DROP NOT NULL;

-- CreateTable
CREATE TABLE "periodo_contrato_locacao" (
    "id" TEXT NOT NULL,
    "imovelLocacaoId" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "valorAluguel" DOUBLE PRECISION NOT NULL,
    "hasCondominio" BOOLEAN NOT NULL DEFAULT false,
    "valorCondominio" DOUBLE PRECISION,
    "hasIPTU" BOOLEAN NOT NULL DEFAULT false,
    "valorIPTU" DOUBLE PRECISION,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "descontoPontualidade" DOUBLE PRECISION,
    "tipoDesconto" TEXT,
    "diasAntecedenciaDesc" INTEGER,
    "multaAtrasoPercentual" DOUBLE PRECISION,
    "diasCarenciaMulta" INTEGER,
    "jurosAtrasoPercentual" DOUBLE PRECISION,
    "diasCarenciaJuros" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "periodo_contrato_locacao_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "periodo_contrato_locacao" ADD CONSTRAINT "periodo_contrato_locacao_imovelLocacaoId_fkey" FOREIGN KEY ("imovelLocacaoId") REFERENCES "imovel_locacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
