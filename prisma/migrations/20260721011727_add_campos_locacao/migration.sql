-- AlterTable
ALTER TABLE "imovel_locacao" ADD COLUMN     "carenciaRepasse" INTEGER,
ADD COLUMN     "irrfResponsabilidade" TEXT,
ADD COLUMN     "taxaAdministracao" DOUBLE PRECISION,
ADD COLUMN     "taxaIntermediacao" DOUBLE PRECISION,
ADD COLUMN     "taxaMultasEncargos" DOUBLE PRECISION;
