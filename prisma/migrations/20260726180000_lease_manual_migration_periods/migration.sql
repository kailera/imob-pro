-- AlterEnum
ALTER TYPE "LeaseStatus" ADD VALUE 'REVIEW_PENDING';

-- AlterTable
ALTER TABLE "lease" ADD COLUMN     "billingStartDate" TIMESTAMP(3),
ADD COLUMN     "legacyCode" TEXT,
ADD COLUMN     "legacySystem" TEXT,
ADD COLUMN     "migratedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ALTER COLUMN "rentalType" DROP NOT NULL;

-- AlterTable
ALTER TABLE "lease_charge" ADD COLUMN     "calculationData" JSONB,
ADD COLUMN     "competence" TEXT,
ADD COLUMN     "termsPeriodId" TEXT;

-- AlterTable
ALTER TABLE "transacao_financeira" ADD COLUMN     "leaseId" TEXT;

-- CreateTable
CREATE TABLE "lease_terms_period" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "rentAmount" DECIMAL(15,2) NOT NULL,
    "paymentDueDay" INTEGER NOT NULL,
    "adjustmentIndex" TEXT,
    "adjustmentPercentage" DECIMAL(8,4),
    "previousRentAmount" DECIMAL(15,2),
    "earlyPaymentDiscount" DECIMAL(15,2),
    "discountType" TEXT,
    "discountDaysBefore" INTEGER,
    "lateFeePercentage" DECIMAL(5,2),
    "lateFeeDays" INTEGER,
    "lateInterestMonthly" DECIMAL(5,2),
    "lateInterestDays" INTEGER,
    "lawyerFeePercentage" DECIMAL(5,2),
    "lawyerFeeGraceDays" INTEGER,
    "transferGraceDays" INTEGER,
    "guaranteedPeriod" TEXT,
    "guaranteeScope" TEXT,
    "adminFeePercentage" DECIMAL(5,2),
    "adminFeeFinesPercentage" DECIMAL(5,2),
    "brokerageFeePercentage" DECIMAL(5,2),
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lease_terms_period_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lease_terms_period_leaseId_effectiveFrom_effectiveTo_idx" ON "lease_terms_period"("leaseId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "lease_terms_period_leaseId_effectiveFrom_key" ON "lease_terms_period"("leaseId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "lease_tenantId_status_idx" ON "lease"("tenantId", "status");

-- CreateIndex
CREATE INDEX "lease_tenantId_billingStartDate_idx" ON "lease"("tenantId", "billingStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "lease_tenantId_legacySystem_legacyCode_key" ON "lease"("tenantId", "legacySystem", "legacyCode");

-- CreateIndex
CREATE INDEX "lease_charge_termsPeriodId_idx" ON "lease_charge"("termsPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "lease_charge_leaseId_competence_chargeType_key" ON "lease_charge"("leaseId", "competence", "chargeType");

-- CreateIndex
CREATE INDEX "transacao_financeira_leaseId_idx" ON "transacao_financeira"("leaseId");

-- AddForeignKey
ALTER TABLE "lease_terms_period" ADD CONSTRAINT "lease_terms_period_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lease_charge" ADD CONSTRAINT "lease_charge_termsPeriodId_fkey" FOREIGN KEY ("termsPeriodId") REFERENCES "lease_terms_period"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacao_financeira" ADD CONSTRAINT "transacao_financeira_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;
