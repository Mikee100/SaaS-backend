-- Ensure SaleItem snapshot unit columns exist for analytics/sales queries.
ALTER TABLE "SaleItem"
ADD COLUMN IF NOT EXISTS "unitAbbreviation" TEXT;

ALTER TABLE "SaleItem"
ADD COLUMN IF NOT EXISTS "unitName" TEXT;
