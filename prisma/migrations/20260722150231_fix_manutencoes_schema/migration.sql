/*
  Warnings:

  - You are about to drop the column `competenciaRepasse` on the `manutencao` table. All the data in the column will be lost.
  - You are about to drop the column `repasseId` on the `manutencao` table. All the data in the column will be lost.
  - You are about to drop the `_ComissaoToManutencao` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ManutencaoToMovimentacaoBancaria` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `manutencaoId` on table `DescontoManutencao` required. This step will fail if there are existing NULL values in that column.
  - Made the column `competencia` on table `DescontoManutencao` required. This step will fail if there are existing NULL values in that column.
  - Made the column `valor` on table `DescontoManutencao` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdAt` on table `DescontoManutencao` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `DescontoManutencao` required. This step will fail if there are existing NULL values in that column.
  - Made the column `manutencaoId` on table `DocumentoManutencao` required. This step will fail if there are existing NULL values in that column.
  - Made the column `nomeOriginal` on table `DocumentoManutencao` required. This step will fail if there are existing NULL values in that column.
  - Made the column `url` on table `DocumentoManutencao` required. This step will fail if there are existing NULL values in that column.
  - Made the column `mimeType` on table `DocumentoManutencao` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdAt` on table `DocumentoManutencao` required. This step will fail if there are existing NULL values in that column.
  - Made the column `imobId` on table `manutencao` required. This step will fail if there are existing NULL values in that column.
  - Made the column `contratoId` on table `manutencao` required. This step will fail if there are existing NULL values in that column.
  - Made the column `imovelId` on table `manutencao` required. This step will fail if there are existing NULL values in that column.
  - Made the column `descricao` on table `manutencao` required. This step will fail if there are existing NULL values in that column.
  - Made the column `dataManutencao` on table `manutencao` required. This step will fail if there are existing NULL values in that column.
  - Made the column `valor` on table `manutencao` required. This step will fail if there are existing NULL values in that column.
  - Made the column `repassarProprietario` on table `manutencao` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdAt` on table `manutencao` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `manutencao` required. This step will fail if there are existing NULL values in that column.
  - Made the column `imobId` on table `prestador_servico` required. This step will fail if there are existing NULL values in that column.
  - Made the column `nome` on table `prestador_servico` required. This step will fail if there are existing NULL values in that column.
  - Made the column `area` on table `prestador_servico` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "_ComissaoToManutencao" DROP CONSTRAINT "_ComissaoToManutencao_A_fkey";

-- DropForeignKey
ALTER TABLE "_ComissaoToManutencao" DROP CONSTRAINT "_ComissaoToManutencao_B_fkey";

-- DropForeignKey
ALTER TABLE "_ManutencaoToMovimentacaoBancaria" DROP CONSTRAINT "_ManutencaoToMovimentacaoBancaria_A_fkey";

-- DropForeignKey
ALTER TABLE "_ManutencaoToMovimentacaoBancaria" DROP CONSTRAINT "_ManutencaoToMovimentacaoBancaria_B_fkey";

-- DropForeignKey
ALTER TABLE "manutencao" DROP CONSTRAINT "manutencao_contratoId_fkey";

-- DropForeignKey
ALTER TABLE "manutencao" DROP CONSTRAINT "manutencao_imovelId_fkey";

-- AlterTable
ALTER TABLE "DescontoManutencao" ALTER COLUMN "manutencaoId" SET NOT NULL,
ALTER COLUMN "competencia" SET NOT NULL,
ALTER COLUMN "valor" SET NOT NULL,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "DocumentoManutencao" ALTER COLUMN "manutencaoId" SET NOT NULL,
ALTER COLUMN "nomeOriginal" SET NOT NULL,
ALTER COLUMN "url" SET NOT NULL,
ALTER COLUMN "mimeType" SET NOT NULL,
ALTER COLUMN "createdAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "manutencao" DROP COLUMN "competenciaRepasse",
DROP COLUMN "repasseId",
ALTER COLUMN "imobId" SET NOT NULL,
ALTER COLUMN "contratoId" SET NOT NULL,
ALTER COLUMN "imovelId" SET NOT NULL,
ALTER COLUMN "descricao" SET NOT NULL,
ALTER COLUMN "dataManutencao" SET NOT NULL,
ALTER COLUMN "valor" SET NOT NULL,
ALTER COLUMN "repassarProprietario" SET NOT NULL,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "prestador_servico" ALTER COLUMN "imobId" SET NOT NULL,
ALTER COLUMN "nome" SET NOT NULL,
ALTER COLUMN "area" SET NOT NULL;

-- DropTable
DROP TABLE "_ComissaoToManutencao";

-- DropTable
DROP TABLE "_ManutencaoToMovimentacaoBancaria";

-- AddForeignKey
ALTER TABLE "manutencao" ADD CONSTRAINT "manutencao_imobId_fkey" FOREIGN KEY ("imobId") REFERENCES "imob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manutencao" ADD CONSTRAINT "manutencao_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "imovel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manutencao" ADD CONSTRAINT "manutencao_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contrato_imovel_locacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
