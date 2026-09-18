-- The company's published service price list, one row per line item. Replaces
-- ranges that were hard-coded separately in the web and the app.

CREATE TYPE "PriceUnit" AS ENUM ('JOB', 'SQM');

ALTER TABLE "ServiceCategory" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ServicePrice" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAm" TEXT NOT NULL,
    "minEtb" INTEGER NOT NULL,
    "maxEtb" INTEGER NOT NULL,
    "unit" "PriceUnit" NOT NULL DEFAULT 'JOB',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ServicePrice_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ServicePrice_categoryId_sortOrder_idx" ON "ServicePrice"("categoryId", "sortOrder");
ALTER TABLE "ServicePrice" ADD CONSTRAINT "ServicePrice_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
