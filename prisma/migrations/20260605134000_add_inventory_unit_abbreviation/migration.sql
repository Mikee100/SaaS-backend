-- Backfill missing schema drift on hosted DBs.
-- Some environments have code expecting Inventory.unitAbbreviation before this column existed.
ALTER TABLE "Inventory"
ADD COLUMN IF NOT EXISTS "unitAbbreviation" TEXT;
