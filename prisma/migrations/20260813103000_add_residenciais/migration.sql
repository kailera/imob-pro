CREATE TYPE "TipoResidencial" AS ENUM ('RESIDENCIAL', 'CONDOMINIO');
CREATE TYPE "CategoriaDespesaResidencial" AS ENUM ('INTERNET', 'GAS', 'LIMPEZA', 'SEGURANCA', 'JARDINAGEM', 'ENERGIA_COMUM', 'OUTROS');
CREATE TYPE "EscopoManutencaoResidencial" AS ENUM ('GERAL', 'IMOVEL_ESPECIFICO');
CREATE TYPE "TipoRateioResidencial" AS ENUM ('IGUALITARIO', 'VALOR_FIXO', 'PERCENTUAL', 'NAO_RATEAR');

CREATE TABLE "residencial" (
  "id" TEXT NOT NULL,
  "imobId" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "tipo" "TipoResidencial" NOT NULL DEFAULT 'RESIDENCIAL',
  "descricao" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "residencial_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "residencial_despesa" (
  "id" TEXT NOT NULL,
  "residencialId" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "categoria" "CategoriaDespesaResidencial" NOT NULL,
  "valor" DECIMAL(15,2) NOT NULL,
  "inicioVigencia" TIMESTAMP(3) NOT NULL,
  "fimVigencia" TIMESTAMP(3),
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "observacao" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "residencial_despesa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "residencial_manutencao" (
  "id" TEXT NOT NULL,
  "residencialId" TEXT NOT NULL,
  "imovelId" TEXT,
  "descricao" TEXT NOT NULL,
  "dataManutencao" TIMESTAMP(3) NOT NULL,
  "valor" DECIMAL(15,2) NOT NULL,
  "status" "StatusManutencao" NOT NULL DEFAULT 'EM_ANDAMENTO',
  "escopo" "EscopoManutencaoResidencial" NOT NULL DEFAULT 'GERAL',
  "tipoRateio" "TipoRateioResidencial" NOT NULL DEFAULT 'NAO_RATEAR',
  "rateio" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "residencial_manutencao_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "imovel" ADD COLUMN "residencialId" TEXT;

CREATE UNIQUE INDEX "residencial_imobId_nome_key" ON "residencial"("imobId", "nome");
CREATE INDEX "residencial_imobId_ativo_idx" ON "residencial"("imobId", "ativo");
CREATE INDEX "residencial_despesa_residencialId_ativo_inicioVigencia_fimVigencia_idx" ON "residencial_despesa"("residencialId", "ativo", "inicioVigencia", "fimVigencia");
CREATE INDEX "residencial_manutencao_residencialId_dataManutencao_idx" ON "residencial_manutencao"("residencialId", "dataManutencao");
CREATE INDEX "residencial_manutencao_imovelId_idx" ON "residencial_manutencao"("imovelId");
CREATE INDEX "imovel_residencialId_idx" ON "imovel"("residencialId");

ALTER TABLE "residencial" ADD CONSTRAINT "residencial_imobId_fkey" FOREIGN KEY ("imobId") REFERENCES "imob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "residencial_despesa" ADD CONSTRAINT "residencial_despesa_residencialId_fkey" FOREIGN KEY ("residencialId") REFERENCES "residencial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "residencial_manutencao" ADD CONSTRAINT "residencial_manutencao_residencialId_fkey" FOREIGN KEY ("residencialId") REFERENCES "residencial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "residencial_manutencao" ADD CONSTRAINT "residencial_manutencao_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "imovel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "imovel" ADD CONSTRAINT "imovel_residencialId_fkey" FOREIGN KEY ("residencialId") REFERENCES "residencial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
