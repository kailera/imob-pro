/*
  Warnings:

  - A unique constraint covering the columns `[interNossoNumero]` on the table `transacao_financeira` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tokenAcesso]` on the table `vistoria` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "TipoImovel" ADD VALUE 'KITNET';

-- AlterTable
ALTER TABLE "ContestacaoVistoria" ADD COLUMN     "comprovanteUrl" TEXT,
ADD COLUMN     "profissionalContato" TEXT,
ADD COLUMN     "profissionalNome" TEXT,
ADD COLUMN     "resolvidoEm" TIMESTAMP(3),
ADD COLUMN     "respostaAdmin" TEXT;

-- AlterTable
ALTER TABLE "imovel" ADD COLUMN     "aluguelDados" JSONB,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "publicado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "imovel_locacao" ADD COLUMN     "descontoPontualidade" DOUBLE PRECISION,
ADD COLUMN     "diasAntecedenciaDesc" INTEGER,
ADD COLUMN     "diasCarenciaJuros" INTEGER,
ADD COLUMN     "diasCarenciaMulta" INTEGER,
ADD COLUMN     "indiceReajuste" TEXT,
ADD COLUMN     "jurosAtrasoPercentual" DOUBLE PRECISION,
ADD COLUMN     "multaAtrasoPercentual" DOUBLE PRECISION,
ADD COLUMN     "multaQuebraContrato" DOUBLE PRECISION,
ADD COLUMN     "periodicidadeReajuste" INTEGER,
ADD COLUMN     "proximoReajuste" TIMESTAMP(3),
ADD COLUMN     "tipoDesconto" TEXT,
ADD COLUMN     "tipoMultaQuebra" TEXT,
ADD COLUMN     "vencimentoQuebra" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "lead" ADD COLUMN     "envioAutomatico" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "interesseBairros" TEXT,
ADD COLUMN     "interesseBanheiros" INTEGER,
ADD COLUMN     "interesseNegocio" TEXT,
ADD COLUMN     "interessePrecoMax" DOUBLE PRECISION,
ADD COLUMN     "interessePrecoMin" DOUBLE PRECISION,
ADD COLUMN     "interesseQuartos" INTEGER,
ADD COLUMN     "interesseTipo" "TipoImovel",
ADD COLUMN     "interesseVagas" INTEGER,
ADD COLUMN     "ultimoEnvioAuto" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "loteamento" ADD COLUMN     "dadosCondominio" JSONB;

-- AlterTable
ALTER TABLE "transacao_financeira" ADD COLUMN     "interBarcode" TEXT,
ADD COLUMN     "interNossoNumero" TEXT,
ADD COLUMN     "interPdfKey" TEXT,
ADD COLUMN     "interPixCode" TEXT,
ADD COLUMN     "interStatus" TEXT;

-- AlterTable
ALTER TABLE "vistoria" ADD COLUMN     "tokenAcesso" TEXT;

-- CreateTable
CREATE TABLE "configuracao_inter" (
    "id" TEXT NOT NULL,
    "imobId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "certPem" TEXT NOT NULL,
    "keyPem" TEXT NOT NULL,
    "sandbox" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracao_inter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "configuracao_inter_imobId_key" ON "configuracao_inter"("imobId");

-- CreateIndex
CREATE UNIQUE INDEX "transacao_financeira_interNossoNumero_key" ON "transacao_financeira"("interNossoNumero");

-- CreateIndex
CREATE UNIQUE INDEX "vistoria_tokenAcesso_key" ON "vistoria"("tokenAcesso");

-- AddForeignKey
ALTER TABLE "configuracao_inter" ADD CONSTRAINT "configuracao_inter_imobId_fkey" FOREIGN KEY ("imobId") REFERENCES "imob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
