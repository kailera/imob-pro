/*
  Warnings:

  - The `telefone` column on the `Fiador` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `endereco` column on the `Fiador` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `documentoUrl` column on the `Fiador` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `telefone` column on the `Locador` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `endereco` column on the `Locador` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `documentoUrl` column on the `Locador` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `telefone` column on the `Locatario` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `endereco` column on the `Locatario` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `documentoUrl` column on the `Locatario` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `imagens` column on the `loteamento` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Fiador" DROP COLUMN "telefone",
ADD COLUMN     "telefone" JSONB,
DROP COLUMN "endereco",
ADD COLUMN     "endereco" JSONB,
DROP COLUMN "documentoUrl",
ADD COLUMN     "documentoUrl" JSONB;

-- AlterTable
ALTER TABLE "Locador" DROP COLUMN "telefone",
ADD COLUMN     "telefone" JSONB,
DROP COLUMN "endereco",
ADD COLUMN     "endereco" JSONB,
DROP COLUMN "documentoUrl",
ADD COLUMN     "documentoUrl" JSONB;

-- AlterTable
ALTER TABLE "Locatario" DROP COLUMN "telefone",
ADD COLUMN     "telefone" JSONB,
DROP COLUMN "endereco",
ADD COLUMN     "endereco" JSONB,
DROP COLUMN "documentoUrl",
ADD COLUMN     "documentoUrl" JSONB;

-- AlterTable
ALTER TABLE "loteamento" DROP COLUMN "imagens",
ADD COLUMN     "imagens" JSONB;
