-- CreateTable
CREATE TABLE IF NOT EXISTS "BomRecipe" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "productId" TEXT NOT NULL,
    "yieldQty" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "yieldUnit" TEXT NOT NULL DEFAULT 'portion',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BomRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BomRecipeLine" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientProductId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "wastePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BomRecipeLine_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "BomRecipe_tenantId_idx" ON "BomRecipe"("tenantId");
CREATE INDEX IF NOT EXISTS "BomRecipe_branchId_idx" ON "BomRecipe"("branchId");
CREATE INDEX IF NOT EXISTS "BomRecipe_productId_idx" ON "BomRecipe"("productId");
CREATE INDEX IF NOT EXISTS "BomRecipe_isActive_idx" ON "BomRecipe"("isActive");

CREATE INDEX IF NOT EXISTS "BomRecipeLine_recipeId_idx" ON "BomRecipeLine"("recipeId");
CREATE INDEX IF NOT EXISTS "BomRecipeLine_ingredientProductId_idx" ON "BomRecipeLine"("ingredientProductId");

-- Foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'BomRecipe_tenantId_fkey'
  ) THEN
    ALTER TABLE "BomRecipe"
      ADD CONSTRAINT "BomRecipe_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'BomRecipe_branchId_fkey'
  ) THEN
    ALTER TABLE "BomRecipe"
      ADD CONSTRAINT "BomRecipe_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'BomRecipe_productId_fkey'
  ) THEN
    ALTER TABLE "BomRecipe"
      ADD CONSTRAINT "BomRecipe_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'BomRecipe_createdBy_fkey'
  ) THEN
    ALTER TABLE "BomRecipe"
      ADD CONSTRAINT "BomRecipe_createdBy_fkey"
      FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'BomRecipeLine_recipeId_fkey'
  ) THEN
    ALTER TABLE "BomRecipeLine"
      ADD CONSTRAINT "BomRecipeLine_recipeId_fkey"
      FOREIGN KEY ("recipeId") REFERENCES "BomRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'BomRecipeLine_ingredientProductId_fkey'
  ) THEN
    ALTER TABLE "BomRecipeLine"
      ADD CONSTRAINT "BomRecipeLine_ingredientProductId_fkey"
      FOREIGN KEY ("ingredientProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
