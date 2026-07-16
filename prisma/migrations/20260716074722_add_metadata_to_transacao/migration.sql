/*
  Warnings:

  - A unique constraint covering the columns `[orgId]` on the table `imob` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "imob" ADD COLUMN     "bairro" TEXT,
ADD COLUMN     "cep" TEXT,
ADD COLUMN     "cidade" TEXT,
ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "complemento" TEXT,
ADD COLUMN     "creci" TEXT,
ADD COLUMN     "emailContato" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "logradouro" TEXT,
ADD COLUMN     "nomeFantasia" TEXT,
ADD COLUMN     "numero" TEXT,
ADD COLUMN     "razaoSocial" TEXT,
ADD COLUMN     "telefone" TEXT,
ADD COLUMN     "uf" TEXT;

-- AlterTable
ALTER TABLE "transacao_financeira" ADD COLUMN     "metadata" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "imob_orgId_key" ON "imob"("orgId");
