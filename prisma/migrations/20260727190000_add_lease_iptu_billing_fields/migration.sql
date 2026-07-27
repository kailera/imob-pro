ALTER TABLE "lease_iptu"
ADD COLUMN "amount" DECIMAL(15, 2),
ADD COLUMN "paymentStartDate" TIMESTAMP(3),
ADD COLUMN "installments" TEXT;
