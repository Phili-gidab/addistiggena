-- Telegram account linking (bot channel + notification dispatch)
ALTER TABLE "User" ADD COLUMN "telegramChatId" TEXT;
CREATE UNIQUE INDEX "User_telegramChatId_key" ON "User"("telegramChatId");

-- Admin verification verdict note (was silently dropped before)
ALTER TABLE "ProviderProfile" ADD COLUMN "verificationNote" TEXT;

-- Dispatch cascade audit trail: one row per technician a job was offered to
CREATE TYPE "OfferOutcome" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'SUPERSEDED');

CREATE TABLE "BookingOffer" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "outcome" "OfferOutcome" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "BookingOffer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BookingOffer_bookingId_offeredAt_idx" ON "BookingOffer"("bookingId", "offeredAt");
CREATE INDEX "BookingOffer_providerId_outcome_idx" ON "BookingOffer"("providerId", "outcome");

ALTER TABLE "BookingOffer" ADD CONSTRAINT "BookingOffer_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookingOffer" ADD CONSTRAINT "BookingOffer_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
