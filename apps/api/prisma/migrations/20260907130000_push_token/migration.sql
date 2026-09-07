-- Expo push token so dispatch offers reach a technician with the app closed.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pushToken" TEXT;
