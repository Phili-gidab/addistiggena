-- Align ProviderProfile with the official Technician Registration Form
-- (company document, received 2026-09-08).

CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');
CREATE TYPE "IdType" AS ENUM ('FAYDA', 'KEBELE');
CREATE TYPE "EducationLevel" AS ENUM ('TVET', 'DIPLOMA', 'DEGREE', 'ABOVE_DEGREE');

-- The form accepts a Kebele card as well as Fayda, so the column can no longer
-- be named after one of them. Rename keeps every number already collected.
ALTER TABLE "ProviderProfile" RENAME COLUMN "faydaIdNumber" TO "idNumber";
ALTER TABLE "ProviderProfile" ADD COLUMN "idType" "IdType";
-- everything captured so far was collected as a Fayda number
UPDATE "ProviderProfile" SET "idType" = 'FAYDA' WHERE "idNumber" IS NOT NULL;

-- section 1: personal details
ALTER TABLE "ProviderProfile" ADD COLUMN "gender" "Gender";
ALTER TABLE "ProviderProfile" ADD COLUMN "email" TEXT;
ALTER TABLE "ProviderProfile" ADD COLUMN "residentialSubCity" TEXT;
ALTER TABLE "ProviderProfile" ADD COLUMN "residentialWoreda" TEXT;
ALTER TABLE "ProviderProfile" ADD COLUMN "houseNumber" TEXT;

-- section 2: professional and technical skills
ALTER TABLE "ProviderProfile" ADD COLUMN "specialization" TEXT;
ALTER TABLE "ProviderProfile" ADD COLUMN "educationLevel" "EducationLevel";
ALTER TABLE "ProviderProfile" ADD COLUMN "certifications" TEXT;

-- section 4: guarantor / emergency contact
ALTER TABLE "ProviderProfile" ADD COLUMN "guarantorRelation" TEXT;
ALTER TABLE "ProviderProfile" ADD COLUMN "guarantorSubCity" TEXT;
ALTER TABLE "ProviderProfile" ADD COLUMN "guarantorWoreda" TEXT;
ALTER TABLE "ProviderProfile" ADD COLUMN "guarantorHouseNo" TEXT;
ALTER TABLE "ProviderProfile" ADD COLUMN "guarantorIdNumber" TEXT;

-- the signed declaration, and who registered them from a paper form
ALTER TABLE "ProviderProfile" ADD COLUMN "declarationName" TEXT;
ALTER TABLE "ProviderProfile" ADD COLUMN "declarationSignedAt" TIMESTAMP(3);
ALTER TABLE "ProviderProfile" ADD COLUMN "registeredById" TEXT;
ALTER TABLE "ProviderProfile" ADD COLUMN "registeredAt" TIMESTAMP(3);
ALTER TABLE "ProviderProfile" ADD CONSTRAINT "ProviderProfile_registeredById_fkey"
    FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
