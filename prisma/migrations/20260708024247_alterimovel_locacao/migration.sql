-- CreateTable
CREATE TABLE "ContestacaoVistoria" (
    "id" TEXT NOT NULL,
    "vistoriaId" TEXT NOT NULL,
    "ambienteId" TEXT,
    "ambienteNome" TEXT,
    "descricao" TEXT NOT NULL,
    "midias" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvido" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ContestacaoVistoria_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "contrato_imovel_locacao" ADD CONSTRAINT "contrato_imovel_locacao_imovelLocacaoId_fkey" FOREIGN KEY ("imovelLocacaoId") REFERENCES "imovel_locacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestacaoVistoria" ADD CONSTRAINT "ContestacaoVistoria_vistoriaId_fkey" FOREIGN KEY ("vistoriaId") REFERENCES "vistoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
