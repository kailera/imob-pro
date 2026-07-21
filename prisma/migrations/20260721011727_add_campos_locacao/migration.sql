-- AlterTable
ALTER TABLE "contrato_imovel_locacao" ADD COLUMN     "documentoUrl" JSONB;

-- AlterTable
ALTER TABLE "imovel_locacao" ADD COLUMN     "carenciaRepasse" INTEGER,
ADD COLUMN     "irrfResponsabilidade" TEXT,
ADD COLUMN     "taxaAdministracao" DOUBLE PRECISION,
ADD COLUMN     "taxaIntermediacao" DOUBLE PRECISION,
ADD COLUMN     "taxaMultasEncargos" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "periodo_contrato_locacao" ADD COLUMN     "indiceReajuste" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "creci" TEXT;

-- AlterTable
ALTER TABLE "vistoria" ADD COLUMN     "locatarioId" TEXT;

-- AddForeignKey
ALTER TABLE "vistoria" ADD CONSTRAINT "vistoria_locatarioId_fkey" FOREIGN KEY ("locatarioId") REFERENCES "Locatario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
