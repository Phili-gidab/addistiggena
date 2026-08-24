-- Roles/Workflow & Dashboard spec: staff roles, support tickets, guarantee claims,
-- dispatch escalation, audit log.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'OPS_MANAGER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'VERIFICATION_OFFICER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPPORT_AGENT';

CREATE TYPE "TicketType" AS ENUM ('DISPUTE', 'GUARANTEE_CLAIM', 'SAFETY');
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'RE_INSPECTION', 'RESOLVED', 'REJECTED');

ALTER TABLE "Booking" ADD COLUMN "escalatedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "disputedAt" TIMESTAMP(3);

CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "type" "TicketType" NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "note" TEXT NOT NULL,
    "resolutionNote" TEXT,
    "refundEtb" DECIMAL(12,2),
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");
CREATE INDEX "SupportTicket_bookingId_idx" ON "SupportTicket"("bookingId");
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" "Role" NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
