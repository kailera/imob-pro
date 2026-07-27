-- This migration introduces the new lease domain to production databases that
-- only contain the legacy `imovel_locacao` model.  The original generated
-- migration incorrectly assumed these enums and tables already existed.

CREATE TYPE "PersonCategory" AS ENUM ('FISICA', 'JURIDICA');
CREATE TYPE "PersonType" AS ENUM ('LOCADOR', 'LOCATARIO', 'FIADOR');
CREATE TYPE "LeaseStatus" AS ENUM ('DRAFT', 'REVIEW_PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'CANCELLED');
CREATE TYPE "RentalType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'SEASONAL');
CREATE TYPE "LeasePartyRole" AS ENUM ('TENANT', 'CO_TENANT', 'LANDLORD', 'GUARANTOR', 'SPOUSE', 'LEGAL_REPRESENTATIVE');

CREATE TABLE "person" (
    "id" TEXT NOT NULL,
    "imobId" TEXT NOT NULL,
    "type" "PersonType" NOT NULL,
    "category" "PersonCategory" NOT NULL DEFAULT 'FISICA',
    "name" TEXT NOT NULL,
    "cpfCnpj" TEXT NOT NULL,
    "secondaryEmail" TEXT, "email" TEXT, "rg" TEXT, "issuingAgency" TEXT,
    "birthDate" TIMESTAMP(3), "nationality" TEXT, "profession" TEXT,
    "maritalStatus" TEXT, "gender" TEXT, "monthlyIncome" DECIMAL(65,30), "rne" TEXT,
    "stateRegistration" TEXT, "municipalRegistration" TEXT, "activity" TEXT,
    "icmsTaxpayerType" TEXT, "optantSimples" BOOLEAN,
    "legalRepName" TEXT, "legalRepCpf" TEXT, "legalRepRg" TEXT,
    "legalRepIssuingAgency" TEXT, "legalRepEmail" TEXT,
    "legalRepPhoneMobile" TEXT, "legalRepPhoneMobileDesc" TEXT,
    "legalRepPhoneLandline" TEXT, "legalRepPhoneLandlineDesc" TEXT,
    "financialName" TEXT, "financialEmail" TEXT,
    "financialPhoneMobile" TEXT, "financialPhoneMobileDesc" TEXT,
    "financialPhoneLandline" TEXT, "financialPhoneLandlineDesc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "person_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "person_phone" (
    "id" TEXT NOT NULL, "personId" TEXT NOT NULL, "phone" TEXT NOT NULL,
    "type" TEXT NOT NULL, "observation" TEXT,
    CONSTRAINT "person_phone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "person_address" (
    "id" TEXT NOT NULL, "personId" TEXT NOT NULL, "cep" TEXT NOT NULL,
    "logradouro" TEXT NOT NULL, "numero" TEXT NOT NULL, "complemento" TEXT,
    "bairro" TEXT NOT NULL, "municipio" TEXT NOT NULL, "estado" TEXT NOT NULL,
    CONSTRAINT "person_address_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lease" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "code" TEXT NOT NULL,
    "status" "LeaseStatus" NOT NULL DEFAULT 'DRAFT', "purpose" TEXT,
    "rentalType" "RentalType", "propertyId" TEXT, "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3), "legacySystem" TEXT, "legacyCode" TEXT,
    "migratedAt" TIMESTAMP(3), "reviewedAt" TIMESTAMP(3), "billingStartDate" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lease_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lease_iptu" (
    "id" TEXT NOT NULL, "leaseId" TEXT NOT NULL, "inscription" TEXT,
    "sequentialNumber" TEXT, "bookletHolder" TEXT, "responsibleParty" TEXT,
    "lastCheckedDate" TIMESTAMP(3), "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lease_iptu_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lease_utility" (
    "id" TEXT NOT NULL, "leaseId" TEXT NOT NULL, "type" TEXT NOT NULL,
    "identification" TEXT, "lastCheckedDate" TIMESTAMP(3), "observation" TEXT,
    "documentUrl" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "lease_utility_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lease_condominium" (
    "id" TEXT NOT NULL, "leaseId" TEXT NOT NULL, "condoName" TEXT, "adminName" TEXT,
    "adminPhone" TEXT, "adminEmail" TEXT, "adminWebsite" TEXT, "syndicName" TEXT,
    "syndicPhone" TEXT, "responsibleParty" TEXT, "lastCheckedDate" TIMESTAMP(3),
    "documentUrl" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "lease_condominium_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lease_party" (
    "id" TEXT NOT NULL, "leaseId" TEXT NOT NULL, "personId" TEXT NOT NULL,
    "role" "LeasePartyRole" NOT NULL, "jointlyLiable" BOOLEAN NOT NULL DEFAULT false,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false, "participation" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lease_party_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lease_terms" (
    "id" TEXT NOT NULL, "leaseId" TEXT NOT NULL, "contractMonths" INTEGER DEFAULT 30,
    "contractPenaltyValue" DECIMAL(15,2), "contractPenaltyType" TEXT DEFAULT 'PERCENT',
    "penaltyBeforeDate" TIMESTAMP(3), "readjustmentPeriodM" INTEGER DEFAULT 12,
    "readjustmentIndex" TEXT DEFAULT 'IGP-M', "rentValue" DECIMAL(15,2) NOT NULL,
    "paymentDueDay" INTEGER NOT NULL DEFAULT 10, "firstPeriodStartDate" TIMESTAMP(3),
    "firstPeriodEndDay" TEXT, "firstPeriodDueDate" TIMESTAMP(3), "nextReadjustmentDate" TIMESTAMP(3),
    "earlyPaymentDiscount" DECIMAL(15,2), "discountType" TEXT DEFAULT 'PERCENT',
    "discountDaysBefore" INTEGER DEFAULT 1, "lateFeePercentage" DECIMAL(5,2),
    "lateFeeDays" INTEGER DEFAULT 1, "lateInterestMonthly" DECIMAL(5,2),
    "lateInterestDays" INTEGER DEFAULT 1, "lawyerFeePercentage" DECIMAL(5,2),
    "lawyerFeeGraceDays" INTEGER DEFAULT 90, "transferGraceDays" INTEGER DEFAULT 10,
    "guaranteedPeriod" TEXT DEFAULT 'Não garantir', "guaranteeScope" TEXT DEFAULT 'Somente o aluguel',
    "adminFeePercentage" DECIMAL(5,2), "adminFeeFinesPercentage" DECIMAL(5,2),
    "brokerageFeePercentage" DECIMAL(5,2), "irrfRetentionResponsibility" TEXT DEFAULT 'LOCATARIO',
    "billingMethod" TEXT DEFAULT 'NONE', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "lease_terms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lease_terms_period" (
    "id" TEXT NOT NULL, "leaseId" TEXT NOT NULL, "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3), "rentAmount" DECIMAL(15,2) NOT NULL, "paymentDueDay" INTEGER NOT NULL,
    "adjustmentIndex" TEXT, "adjustmentPercentage" DECIMAL(8,4), "previousRentAmount" DECIMAL(15,2),
    "earlyPaymentDiscount" DECIMAL(15,2), "discountType" TEXT, "discountDaysBefore" INTEGER,
    "lateFeePercentage" DECIMAL(5,2), "lateFeeDays" INTEGER, "lateInterestMonthly" DECIMAL(5,2),
    "lateInterestDays" INTEGER, "lawyerFeePercentage" DECIMAL(5,2), "lawyerFeeGraceDays" INTEGER,
    "transferGraceDays" INTEGER, "guaranteedPeriod" TEXT, "guaranteeScope" TEXT,
    "adminFeePercentage" DECIMAL(5,2), "adminFeeFinesPercentage" DECIMAL(5,2),
    "brokerageFeePercentage" DECIMAL(5,2), "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT, "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING', "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lease_terms_period_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lease_charge" (
    "id" TEXT NOT NULL, "leaseId" TEXT NOT NULL, "termsPeriodId" TEXT, "competence" TEXT,
    "description" TEXT NOT NULL, "chargeType" TEXT NOT NULL, "amount" DECIMAL(15,2) NOT NULL,
    "calculationData" JSONB, "dueDate" TIMESTAMP(3) NOT NULL, "paidDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "lease_charge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lease_guarantee" (
    "id" TEXT NOT NULL, "leaseId" TEXT NOT NULL, "type" TEXT NOT NULL, "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lease_guarantee_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lease_clause" (
    "id" TEXT NOT NULL, "leaseId" TEXT NOT NULL, "title" TEXT NOT NULL, "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "lease_clause_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lease_document" (
    "id" TEXT NOT NULL, "leaseId" TEXT NOT NULL, "name" TEXT NOT NULL, "url" TEXT NOT NULL,
    "type" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lease_document_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "imovel_locacao" ADD COLUMN "personId" TEXT;
ALTER TABLE "transacao_financeira" ADD COLUMN "leaseId" TEXT;

CREATE UNIQUE INDEX "lease_code_key" ON "lease"("code");
CREATE INDEX "lease_tenantId_status_idx" ON "lease"("tenantId", "status");
CREATE INDEX "lease_tenantId_billingStartDate_idx" ON "lease"("tenantId", "billingStartDate");
CREATE UNIQUE INDEX "lease_tenantId_legacySystem_legacyCode_key" ON "lease"("tenantId", "legacySystem", "legacyCode");
CREATE UNIQUE INDEX "lease_iptu_leaseId_key" ON "lease_iptu"("leaseId");
CREATE UNIQUE INDEX "lease_utility_leaseId_type_key" ON "lease_utility"("leaseId", "type");
CREATE UNIQUE INDEX "lease_condominium_leaseId_key" ON "lease_condominium"("leaseId");
CREATE INDEX "lease_party_leaseId_idx" ON "lease_party"("leaseId");
CREATE INDEX "lease_party_personId_idx" ON "lease_party"("personId");
CREATE UNIQUE INDEX "lease_party_leaseId_personId_role_key" ON "lease_party"("leaseId", "personId", "role");
CREATE UNIQUE INDEX "lease_terms_leaseId_key" ON "lease_terms"("leaseId");
CREATE INDEX "lease_terms_period_leaseId_effectiveFrom_effectiveTo_idx" ON "lease_terms_period"("leaseId", "effectiveFrom", "effectiveTo");
CREATE UNIQUE INDEX "lease_terms_period_leaseId_effectiveFrom_key" ON "lease_terms_period"("leaseId", "effectiveFrom");
CREATE INDEX "lease_charge_termsPeriodId_idx" ON "lease_charge"("termsPeriodId");
CREATE UNIQUE INDEX "lease_charge_leaseId_competence_chargeType_key" ON "lease_charge"("leaseId", "competence", "chargeType");
CREATE UNIQUE INDEX "lease_guarantee_leaseId_key" ON "lease_guarantee"("leaseId");
CREATE INDEX "transacao_financeira_leaseId_idx" ON "transacao_financeira"("leaseId");

ALTER TABLE "person" ADD CONSTRAINT "person_imobId_fkey" FOREIGN KEY ("imobId") REFERENCES "imob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "person_phone" ADD CONSTRAINT "person_phone_personId_fkey" FOREIGN KEY ("personId") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "person_address" ADD CONSTRAINT "person_address_personId_fkey" FOREIGN KEY ("personId") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "imovel_locacao" ADD CONSTRAINT "imovel_locacao_personId_fkey" FOREIGN KEY ("personId") REFERENCES "person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lease" ADD CONSTRAINT "lease_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "imob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lease" ADD CONSTRAINT "lease_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "imovel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lease_iptu" ADD CONSTRAINT "lease_iptu_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lease_utility" ADD CONSTRAINT "lease_utility_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lease_condominium" ADD CONSTRAINT "lease_condominium_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lease_party" ADD CONSTRAINT "lease_party_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lease_party" ADD CONSTRAINT "lease_party_personId_fkey" FOREIGN KEY ("personId") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lease_terms" ADD CONSTRAINT "lease_terms_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lease_terms_period" ADD CONSTRAINT "lease_terms_period_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lease_charge" ADD CONSTRAINT "lease_charge_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lease_charge" ADD CONSTRAINT "lease_charge_termsPeriodId_fkey" FOREIGN KEY ("termsPeriodId") REFERENCES "lease_terms_period"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lease_guarantee" ADD CONSTRAINT "lease_guarantee_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lease_clause" ADD CONSTRAINT "lease_clause_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lease_document" ADD CONSTRAINT "lease_document_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transacao_financeira" ADD CONSTRAINT "transacao_financeira_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;
