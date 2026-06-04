-- Add variation-level images
ALTER TABLE "ProductVariation"
ADD COLUMN IF NOT EXISTS "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
