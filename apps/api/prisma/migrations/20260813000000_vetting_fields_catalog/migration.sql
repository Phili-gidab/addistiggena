-- Vetting protocol alignment (official onboarding document):
-- new document types + provider profile identity/guarantor fields.

-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'WOREDA_RECOMMENDATION';
ALTER TYPE "DocumentType" ADD VALUE 'COC_CERTIFICATE';

-- AlterTable
ALTER TABLE "ProviderProfile"
  ADD COLUMN "subCity" TEXT,
  ADD COLUMN "woreda" TEXT,
  ADD COLUMN "faydaIdNumber" TEXT,
  ADD COLUMN "yearsExperience" INTEGER,
  ADD COLUMN "guarantorName" TEXT,
  ADD COLUMN "guarantorPhone" TEXT;
