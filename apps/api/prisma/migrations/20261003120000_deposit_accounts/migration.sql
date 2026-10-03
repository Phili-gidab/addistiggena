-- Where technicians are told to pay their commission top-up. Display only:
-- nothing is collected through these, the technician pays by their own means
-- and declares the reference (client decision, Oct 2026).
CREATE TYPE "DepositAccountKind" AS ENUM ('BANK', 'TELEBIRR', 'CBE_BIRR', 'OTHER');

CREATE TABLE "DepositAccount" (
    "id" TEXT NOT NULL,
    "kind" "DepositAccountKind" NOT NULL DEFAULT 'BANK',
    "label" TEXT NOT NULL,
    "holderName" TEXT,
    "number" TEXT NOT NULL,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepositAccount_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DepositAccount_isActive_sortOrder_idx" ON "DepositAccount"("isActive", "sortOrder");
