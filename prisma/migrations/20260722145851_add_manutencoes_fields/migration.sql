-- CreateEnum
CREATE TYPE "StatusManutencao" AS ENUM ('EM_ANDAMENTO', 'FINALIZADA');

-- CreateEnum
CREATE TYPE "StatusDescontoManutencao" AS ENUM ('PROGRAMADO', 'APLICADO', 'CANCELADO');

-- AlterTable
ALTER TABLE "imovel" ADD COLUMN     "logradouro" TEXT;

-- CreateTable
CREATE TABLE "prestador_servico" (
    "id" TEXT NOT NULL,
    "imobId" TEXT,
    "nome" TEXT,
    "area" TEXT,
    "telefone" TEXT,
    "pix" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prestador_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manutencao" (
    "id" TEXT NOT NULL,
    "imobId" TEXT,
    "contratoId" TEXT,
    "imovelId" TEXT,
    "prestadorId" TEXT,
    "descricao" TEXT,
    "dataManutencao" TIMESTAMP(3),
    "valor" DECIMAL(15,2),
    "status" "StatusManutencao" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "repassarProprietario" BOOLEAN DEFAULT false,
    "competenciaRepasse" TEXT,
    "repasseId" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "manutencao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoManutencao" (
    "id" TEXT NOT NULL,
    "manutencaoId" TEXT,
    "nomeOriginal" TEXT,
    "url" TEXT,
    "storageKey" TEXT,
    "mimeType" TEXT,
    "tamanhoBytes" INTEGER,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoManutencao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DescontoManutencao" (
    "id" TEXT NOT NULL,
    "manutencaoId" TEXT,
    "competencia" TEXT,
    "valor" DECIMAL(15,2),
    "status" "StatusDescontoManutencao" NOT NULL DEFAULT 'PROGRAMADO',
    "repasseId" TEXT,
    "aplicadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "DescontoManutencao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ManutencaoToMovimentacaoBancaria" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ManutencaoToMovimentacaoBancaria_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ComissaoToManutencao" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ComissaoToManutencao_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "prestador_servico_imobId_nome_idx" ON "prestador_servico"("imobId", "nome");

-- CreateIndex
CREATE INDEX "manutencao_imobId_idx" ON "manutencao"("imobId");

-- CreateIndex
CREATE INDEX "manutencao_contratoId_idx" ON "manutencao"("contratoId");

-- CreateIndex
CREATE INDEX "manutencao_imovelId_idx" ON "manutencao"("imovelId");

-- CreateIndex
CREATE INDEX "manutencao_prestadorId_idx" ON "manutencao"("prestadorId");

-- CreateIndex
CREATE INDEX "DescontoManutencao_competencia_status_idx" ON "DescontoManutencao"("competencia", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DescontoManutencao_manutencaoId_competencia_key" ON "DescontoManutencao"("manutencaoId", "competencia");

-- CreateIndex
CREATE INDEX "_ManutencaoToMovimentacaoBancaria_B_index" ON "_ManutencaoToMovimentacaoBancaria"("B");

-- CreateIndex
CREATE INDEX "_ComissaoToManutencao_B_index" ON "_ComissaoToManutencao"("B");

-- AddForeignKey
ALTER TABLE "prestador_servico" ADD CONSTRAINT "prestador_servico_imobId_fkey" FOREIGN KEY ("imobId") REFERENCES "imob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manutencao" ADD CONSTRAINT "manutencao_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "imovel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manutencao" ADD CONSTRAINT "manutencao_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contrato_imovel_locacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manutencao" ADD CONSTRAINT "manutencao_prestadorId_fkey" FOREIGN KEY ("prestadorId") REFERENCES "prestador_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoManutencao" ADD CONSTRAINT "DocumentoManutencao_manutencaoId_fkey" FOREIGN KEY ("manutencaoId") REFERENCES "manutencao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescontoManutencao" ADD CONSTRAINT "DescontoManutencao_manutencaoId_fkey" FOREIGN KEY ("manutencaoId") REFERENCES "manutencao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescontoManutencao" ADD CONSTRAINT "DescontoManutencao_repasseId_fkey" FOREIGN KEY ("repasseId") REFERENCES "transacao_financeira"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ManutencaoToMovimentacaoBancaria" ADD CONSTRAINT "_ManutencaoToMovimentacaoBancaria_A_fkey" FOREIGN KEY ("A") REFERENCES "manutencao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ManutencaoToMovimentacaoBancaria" ADD CONSTRAINT "_ManutencaoToMovimentacaoBancaria_B_fkey" FOREIGN KEY ("B") REFERENCES "movimentacao_bancaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ComissaoToManutencao" ADD CONSTRAINT "_ComissaoToManutencao_A_fkey" FOREIGN KEY ("A") REFERENCES "comissao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ComissaoToManutencao" ADD CONSTRAINT "_ComissaoToManutencao_B_fkey" FOREIGN KEY ("B") REFERENCES "manutencao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
