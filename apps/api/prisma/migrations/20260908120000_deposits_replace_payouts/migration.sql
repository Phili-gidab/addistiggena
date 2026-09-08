-- Money now flows technician -> platform. The technician takes the customer's
-- cash directly and pre-funds a commission wallet, so payouts no longer exist.

-- 1. staff accounts can be disabled without losing their audit trail
ALTER TABLE "User" ADD COLUMN "disabledAt" TIMESTAMP(3);

-- 2. deposits replace payouts
CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');
CREATE TYPE "DepositMethod" AS ENUM ('BANK_TRANSFER', 'TELEBIRR', 'CBE_BIRR', 'CASH_OFFICE');

CREATE TABLE "Deposit" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amountEtb" DECIMAL(12,2) NOT NULL,
    "method" "DepositMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "reference" TEXT NOT NULL,
    "status" "DepositStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),
    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Deposit_status_createdAt_idx" ON "Deposit"("status", "createdAt");
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_walletId_fkey"
    FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_recordedById_fkey"
    FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP TABLE "Payout";
DROP TYPE "PayoutStatus";

-- 3. retire the PAYOUT ledger type. Existing rows are demo-seeded payout
--    reservations against a model that no longer exists, so they are removed
--    rather than remapped - keeping them would misstate the new balances.
DELETE FROM "WalletTransaction" WHERE "type" = 'PAYOUT';
ALTER TYPE "LedgerType" RENAME TO "LedgerType_old";
CREATE TYPE "LedgerType" AS ENUM ('JOB_CREDIT', 'COMMISSION', 'DEPOSIT', 'ADJUSTMENT');
ALTER TABLE "WalletTransaction" ALTER COLUMN "type" TYPE "LedgerType"
    USING ("type"::text::"LedgerType");
DROP TYPE "LedgerType_old";

-- 4. balances used to mean "earnings the platform owes the technician". Under
--    the prepaid model a balance is credit the technician holds with us, and
--    nobody has deposited yet, so everyone starts at zero.
DELETE FROM "WalletTransaction" WHERE "type" = 'JOB_CREDIT';
UPDATE "Wallet" SET "balanceEtb" = 0;
