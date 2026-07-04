ALTER TABLE "Sale"
ADD COLUMN IF NOT EXISTS "managerOverrideApprovedByUserId" TEXT,
ADD COLUMN IF NOT EXISTS "managerOverrideApprovedByName" TEXT,
ADD COLUMN IF NOT EXISTS "managerOverrideReason" TEXT,
ADD COLUMN IF NOT EXISTS "managerOverrideApprovedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "managerOverrideDiscountAmount" DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS "Sale_managerOverrideApprovedByUserId_idx"
  ON "Sale" ("managerOverrideApprovedByUserId");

CREATE INDEX IF NOT EXISTS "Sale_managerOverrideApprovedAt_idx"
  ON "Sale" ("managerOverrideApprovedAt");
