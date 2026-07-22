-- AlterTable
ALTER TABLE "transacao_financeira"
ADD COLUMN "interCodigoSolicitacao" TEXT,
ADD COLUMN "interDataRecebimento" TIMESTAMP(3),
ADD COLUMN "interOrigemRecebimento" TEXT,
ADD COLUMN "interSeuNumero" TEXT,
ADD COLUMN "interTxId" TEXT,
ADD COLUMN "interValorRecebido" DECIMAL(15,2),
ADD COLUMN "transacaoOrigemId" TEXT;

-- CreateEnum
CREATE TYPE "InterWebhookEventStatus" AS ENUM ('RECEBIDO', 'PROCESSANDO', 'PROCESSADO', 'IGNORADO', 'ERRO');

-- CreateTable
CREATE TABLE "inter_webhook_event" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "codigoSolicitacao" TEXT,
    "nossoNumero" TEXT,
    "seuNumero" TEXT,
    "contaCorrente" TEXT,
    "situacao" TEXT NOT NULL,
    "origemRecebimento" TEXT,
    "valorTotalRecebido" DECIMAL(15,2),
    "dataHoraSituacao" TIMESTAMP(3),
    "payload" JSONB NOT NULL,
    "status" "InterWebhookEventStatus" NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "erro" TEXT,
    "recebidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processadoEm" TIMESTAMP(3),

    CONSTRAINT "inter_webhook_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transacao_financeira_interCodigoSolicitacao_key" ON "transacao_financeira"("interCodigoSolicitacao");
CREATE UNIQUE INDEX "transacao_financeira_interSeuNumero_key" ON "transacao_financeira"("interSeuNumero");
CREATE UNIQUE INDEX "transacao_financeira_transacaoOrigemId_key" ON "transacao_financeira"("transacaoOrigemId");
CREATE UNIQUE INDEX "inter_webhook_event_eventKey_key" ON "inter_webhook_event"("eventKey");
CREATE INDEX "inter_webhook_event_codigoSolicitacao_idx" ON "inter_webhook_event"("codigoSolicitacao");
CREATE INDEX "inter_webhook_event_nossoNumero_idx" ON "inter_webhook_event"("nossoNumero");
CREATE INDEX "inter_webhook_event_status_recebidoEm_idx" ON "inter_webhook_event"("status", "recebidoEm");

-- AddForeignKey
ALTER TABLE "transacao_financeira"
ADD CONSTRAINT "transacao_financeira_transacaoOrigemId_fkey"
FOREIGN KEY ("transacaoOrigemId") REFERENCES "transacao_financeira"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
