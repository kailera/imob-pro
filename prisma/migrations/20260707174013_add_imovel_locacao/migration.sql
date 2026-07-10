-- CreateEnum
CREATE TYPE "UsersRole" AS ENUM ('OPERADOR', 'VISTORIADOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "StatusLote" AS ENUM ('DISPONIVEL', 'RESERVADO', 'VENDIDO');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NOVO', 'EM_ATENDIMENTO', 'VISITA_AGENDADA', 'FECHADO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "LimpezaStatus" AS ENUM ('EXCELENTE', 'BOA', 'REGULAR', 'RUIM');

-- CreateEnum
CREATE TYPE "TipoImovelVistoriado" AS ENUM ('CASA', 'APARTAMENTO');

-- CreateEnum
CREATE TYPE "TipoImovel" AS ENUM ('CASA', 'CONDOMINIO', 'LOTE', 'COMERCIAL', 'RURAL');

-- CreateEnum
CREATE TYPE "TipoVistoria" AS ENUM ('ENTRADA', 'SAIDA', 'PERIODICA');

-- CreateEnum
CREATE TYPE "VistoriaStatus" AS ENUM ('NAO_INICIADA', 'EM_ANDAMENTO', 'AGUARDANDO_APROVACAO', 'CONCLUIDA', 'CONTESTADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('PENDENTE', 'CONFORME', 'NAO_CONFORME');

-- CreateEnum
CREATE TYPE "TipoMidia" AS ENUM ('FOTO', 'VIDEO');

-- CreateEnum
CREATE TYPE "TipoTransacao" AS ENUM ('RECEITA', 'DESPESA');

-- CreateEnum
CREATE TYPE "CategoriaTransacao" AS ENUM ('ALUGUEL', 'REPASSE', 'TAXA_ADM', 'COMISSAO', 'CUSTO_OPERACIONAL', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusTransacao" AS ENUM ('PENDENTE', 'LIQUIDADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoNegocioComissao" AS ENUM ('VENDA', 'LOCACAO');

-- CreateEnum
CREATE TYPE "StatusComissao" AS ENUM ('PENDENTE', 'PAGO');

-- CreateEnum
CREATE TYPE "StatusMovimentacaoBancaria" AS ENUM ('PENDENTE', 'CONCILIADO');

-- CreateEnum
CREATE TYPE "TipoMovimentacaoBancaria" AS ENUM ('CREDITO', 'DEBITO');

-- CreateTable
CREATE TABLE "imob" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "imob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UsersRole" NOT NULL,
    "imobId" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imovel" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "cep" INTEGER NOT NULL,
    "tipo" "TipoImovel" NOT NULL DEFAULT 'CASA',
    "forVenda" BOOLEAN NOT NULL DEFAULT false,
    "forLocacao" BOOLEAN NOT NULL DEFAULT false,
    "valorAluguel" INTEGER,
    "valorCondominio" INTEGER,
    "valorIPTU" INTEGER,
    "valorVenda" INTEGER,
    "valorTotal" INTEGER,
    "area" INTEGER NOT NULL DEFAULT 0,
    "titulo" TEXT NOT NULL DEFAULT '',
    "descricao" TEXT,
    "imagens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "quartos" INTEGER DEFAULT 0,
    "banheiros" INTEGER DEFAULT 0,
    "vagas" INTEGER DEFAULT 0,
    "loteamentoId" TEXT,
    "quadra" TEXT,
    "loteNumero" TEXT,
    "topografia" TEXT,
    "statusLote" "StatusLote" DEFAULT 'DISPONIVEL',
    "imobId" TEXT NOT NULL,

    CONSTRAINT "imovel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imovel_locacao" (
    "id" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "valorAluguel" DOUBLE PRECISION NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "hasCondominio" BOOLEAN NOT NULL,
    "hasIPTU" BOOLEAN NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "imovelId" TEXT NOT NULL,

    CONSTRAINT "imovel_locacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Locador" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpfCnpj" TEXT NOT NULL,
    "telefone" TEXT[],
    "email" TEXT NOT NULL,
    "endereco" TEXT[],
    "dataNasc" TEXT NOT NULL,
    "rg" TEXT NOT NULL,
    "orgaoEmissor" TEXT NOT NULL,
    "estadoCivil" TEXT NOT NULL,
    "profissao" TEXT NOT NULL,
    "nacionalidade" TEXT NOT NULL,
    "genero" TEXT NOT NULL,
    "documentoUrl" TEXT[],
    "imovelLocacaoId" TEXT,

    CONSTRAINT "Locador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contrato_imovel_locacao" (
    "id" TEXT NOT NULL,
    "imovelLocacaoId" TEXT,
    "imovelId" TEXT NOT NULL,
    "imobId" TEXT NOT NULL,

    CONSTRAINT "contrato_imovel_locacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fiador" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpfCnpj" TEXT NOT NULL,
    "telefone" TEXT[],
    "email" TEXT NOT NULL,
    "endereco" TEXT[],
    "dataNasc" TEXT NOT NULL,
    "rg" TEXT NOT NULL,
    "orgaoEmissor" TEXT NOT NULL,
    "estadoCivil" TEXT NOT NULL,
    "profissao" TEXT NOT NULL,
    "nacionalidade" TEXT NOT NULL,
    "genero" TEXT NOT NULL,
    "documentoUrl" TEXT[],
    "contratoId" TEXT NOT NULL,

    CONSTRAINT "Fiador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Locatario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpfCnpj" TEXT NOT NULL,
    "telefone" TEXT[],
    "email" TEXT NOT NULL,
    "endereco" TEXT[],
    "dataNasc" TEXT NOT NULL,
    "rg" TEXT NOT NULL,
    "orgaoEmissor" TEXT NOT NULL,
    "estadoCivil" TEXT NOT NULL,
    "profissao" TEXT NOT NULL,
    "nacionalidade" TEXT NOT NULL,
    "genero" TEXT NOT NULL,
    "documentoUrl" TEXT[],
    "contratoId" TEXT,

    CONSTRAINT "Locatario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imovel_venda" (
    "id" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "imovelId" TEXT NOT NULL,

    CONSTRAINT "imovel_venda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loteamento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "imagens" TEXT[],
    "infraestrutura" JSONB,
    "coordenadasSvg" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loteamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "loteInfo" TEXT,
    "valorSimulado" DOUBLE PRECISION,
    "status" "LeadStatus" NOT NULL DEFAULT 'NOVO',
    "origem" TEXT NOT NULL DEFAULT 'SITE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vistoria" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "tipo" "TipoVistoria" NOT NULL,
    "observacoes" TEXT NOT NULL,
    "assinatura" TEXT,
    "operadorId" TEXT NOT NULL,
    "vistoriadorId" TEXT NOT NULL,
    "imovelId" TEXT NOT NULL,
    "tipoImovelVistoriado" "TipoImovelVistoriado" NOT NULL,
    "status" "VistoriaStatus" NOT NULL,
    "proprietario" TEXT,
    "infoGeral" JSONB,
    "chavesQuantidade" INTEGER,
    "chavesObservacao" TEXT,
    "medidorAguaNumero" TEXT,
    "medidorAguaLeitura" TEXT,
    "medidorAguaFotoUrl" TEXT,
    "medidorLuzNumero" TEXT,
    "medidorLuzLeitura" TEXT,
    "medidorLuzFotoUrl" TEXT,
    "reparosNecessarios" TEXT,
    "limpezaStatus" "LimpezaStatus",
    "limpezaObservacao" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "vistoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambiente_vistoria" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'Outro',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "visaoGeral" TEXT,
    "comentarios" TEXT,
    "vistoriaId" TEXT NOT NULL,

    CONSTRAINT "ambiente_vistoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_ambiente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "statusVerificacao" "ItemStatus" NOT NULL DEFAULT 'PENDENTE',
    "ambienteVistoriaId" TEXT NOT NULL,

    CONSTRAINT "item_ambiente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentario_item" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "itemAmbienteId" TEXT NOT NULL,

    CONSTRAINT "comentario_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentario_vistoria" (
    "id" TEXT NOT NULL,
    "vistoriaId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "midias" JSONB,

    CONSTRAINT "comentario_vistoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "foto_item" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemAmbienteId" TEXT,
    "vistoriaId" TEXT,

    CONSTRAINT "foto_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "midia_comentario" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" "TipoMidia" NOT NULL DEFAULT 'FOTO',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comentarioId" TEXT NOT NULL,

    CONSTRAINT "midia_comentario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transacao_financeira" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "tipo" "TipoTransacao" NOT NULL,
    "categoria" "CategoriaTransacao" NOT NULL,
    "status" "StatusTransacao" NOT NULL DEFAULT 'PENDENTE',
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "imovelId" TEXT,
    "usuarioId" TEXT,
    "contratoId" TEXT,

    CONSTRAINT "transacao_financeira_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comissao" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "valorBrutoNegocio" DOUBLE PRECISION NOT NULL,
    "percentual" DOUBLE PRECISION NOT NULL,
    "valorComissao" DOUBLE PRECISION NOT NULL,
    "tipoNegocio" "TipoNegocioComissao" NOT NULL,
    "referenciaId" TEXT,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "status" "StatusComissao" NOT NULL DEFAULT 'PENDENTE',
    "dataPagamento" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "transacaoId" TEXT,

    CONSTRAINT "comissao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacao_bancaria" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "tipo" "TipoMovimentacaoBancaria" NOT NULL,
    "fitid" TEXT,
    "status" "StatusMovimentacaoBancaria" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "transacaoId" TEXT,

    CONSTRAINT "movimentacao_bancaria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "imovel_codigo_key" ON "imovel"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "loteamento_slug_key" ON "loteamento"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "movimentacao_bancaria_fitid_key" ON "movimentacao_bancaria"("fitid");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_imobId_fkey" FOREIGN KEY ("imobId") REFERENCES "imob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imovel" ADD CONSTRAINT "imovel_loteamentoId_fkey" FOREIGN KEY ("loteamentoId") REFERENCES "loteamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imovel" ADD CONSTRAINT "imovel_imobId_fkey" FOREIGN KEY ("imobId") REFERENCES "imob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imovel_locacao" ADD CONSTRAINT "imovel_locacao_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "imovel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Locador" ADD CONSTRAINT "Locador_imovelLocacaoId_fkey" FOREIGN KEY ("imovelLocacaoId") REFERENCES "imovel_locacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_imovel_locacao" ADD CONSTRAINT "contrato_imovel_locacao_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "imovel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_imovel_locacao" ADD CONSTRAINT "contrato_imovel_locacao_imobId_fkey" FOREIGN KEY ("imobId") REFERENCES "imob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fiador" ADD CONSTRAINT "Fiador_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contrato_imovel_locacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Locatario" ADD CONSTRAINT "Locatario_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contrato_imovel_locacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imovel_venda" ADD CONSTRAINT "imovel_venda_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "imovel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vistoria" ADD CONSTRAINT "vistoria_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vistoria" ADD CONSTRAINT "vistoria_vistoriadorId_fkey" FOREIGN KEY ("vistoriadorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vistoria" ADD CONSTRAINT "vistoria_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "imovel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambiente_vistoria" ADD CONSTRAINT "ambiente_vistoria_vistoriaId_fkey" FOREIGN KEY ("vistoriaId") REFERENCES "vistoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_ambiente" ADD CONSTRAINT "item_ambiente_ambienteVistoriaId_fkey" FOREIGN KEY ("ambienteVistoriaId") REFERENCES "ambiente_vistoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentario_item" ADD CONSTRAINT "comentario_item_itemAmbienteId_fkey" FOREIGN KEY ("itemAmbienteId") REFERENCES "item_ambiente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentario_vistoria" ADD CONSTRAINT "comentario_vistoria_vistoriaId_fkey" FOREIGN KEY ("vistoriaId") REFERENCES "vistoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foto_item" ADD CONSTRAINT "foto_item_itemAmbienteId_fkey" FOREIGN KEY ("itemAmbienteId") REFERENCES "item_ambiente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foto_item" ADD CONSTRAINT "foto_item_vistoriaId_fkey" FOREIGN KEY ("vistoriaId") REFERENCES "vistoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "midia_comentario" ADD CONSTRAINT "midia_comentario_comentarioId_fkey" FOREIGN KEY ("comentarioId") REFERENCES "comentario_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacao_financeira" ADD CONSTRAINT "transacao_financeira_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "imovel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacao_financeira" ADD CONSTRAINT "transacao_financeira_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacao_financeira" ADD CONSTRAINT "transacao_financeira_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contrato_imovel_locacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissao" ADD CONSTRAINT "comissao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissao" ADD CONSTRAINT "comissao_transacaoId_fkey" FOREIGN KEY ("transacaoId") REFERENCES "transacao_financeira"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_bancaria" ADD CONSTRAINT "movimentacao_bancaria_transacaoId_fkey" FOREIGN KEY ("transacaoId") REFERENCES "transacao_financeira"("id") ON DELETE SET NULL ON UPDATE CASCADE;
