-- Impede duas cobranças mensais para o mesmo contrato e competência.
-- Registros históricos permanecem sem chave até serem reconciliados pelo gerador.
ALTER TABLE "transacao_financeira"
ADD COLUMN "billingKey" TEXT;

CREATE UNIQUE INDEX "transacao_financeira_billingKey_key"
ON "transacao_financeira"("billingKey");
