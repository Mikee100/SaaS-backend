-- Create table for primary and alternate product variation barcodes
CREATE TABLE "ProductVariationBarcode" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CODE128',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProductVariationBarcode_pkey" PRIMARY KEY ("id")
);

-- Barcode must be unique per tenant (even when deactivated)
CREATE UNIQUE INDEX "ProductVariationBarcode_tenantId_code_key"
ON "ProductVariationBarcode"("tenantId", "code");

CREATE INDEX "ProductVariationBarcode_variationId_idx"
ON "ProductVariationBarcode"("variationId");

CREATE INDEX "ProductVariationBarcode_tenantId_isPrimary_idx"
ON "ProductVariationBarcode"("tenantId", "isPrimary");

CREATE INDEX "ProductVariationBarcode_tenantId_isActive_idx"
ON "ProductVariationBarcode"("tenantId", "isActive");

-- Enforce a single active primary barcode per variation
CREATE UNIQUE INDEX "ProductVariationBarcode_primary_variation_unique"
ON "ProductVariationBarcode"("variationId")
WHERE "isPrimary" = true AND "isActive" = true;

ALTER TABLE "ProductVariationBarcode"
ADD CONSTRAINT "ProductVariationBarcode_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductVariationBarcode"
ADD CONSTRAINT "ProductVariationBarcode_variationId_fkey"
FOREIGN KEY ("variationId") REFERENCES "ProductVariation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill existing variation barcode values as active primary records
INSERT INTO "ProductVariationBarcode" (
    "id",
    "tenantId",
    "variationId",
    "code",
    "type",
    "isPrimary",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    concat('pvb_', pv."id"),
    pv."tenantId",
    pv."id",
    pv."barcode",
    'CODE128',
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "ProductVariation" pv
WHERE pv."barcode" IS NOT NULL
  AND btrim(pv."barcode") <> ''
ON CONFLICT ("tenantId", "code") DO NOTHING;
