-- Two roles deferred from the client's roles/workflow spec section 2.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'FINANCE_OFFICER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUBCITY_COORDINATOR';

-- The sub-city a coordinator is responsible for (their views are scoped to it).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subCity" TEXT;
