ALTER TABLE "transacao_financeira"
ADD COLUMN "interMensagem" JSONB;

CREATE TABLE "boleto_charge_item" (
    "id" TEXT NOT NULL,
    "transacaoId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boleto_charge_item_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "boleto_charge_item_transacaoId_order_idx"
ON "boleto_charge_item"("transacaoId", "order");

ALTER TABLE "boleto_charge_item"
ADD CONSTRAINT "boleto_charge_item_transacaoId_fkey"
FOREIGN KEY ("transacaoId") REFERENCES "transacao_financeira"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
