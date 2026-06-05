-- Add restaurant order linkage to sales for restaurant module compatibility
ALTER TABLE "Sale"
ADD COLUMN IF NOT EXISTS "restaurantOrderId" TEXT;

-- Keep Prisma's expected unique constraint semantics
CREATE UNIQUE INDEX IF NOT EXISTS "Sale_restaurantOrderId_key"
ON "Sale"("restaurantOrderId");

-- Add FK only when missing to keep migration idempotent in drifted environments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Sale_restaurantOrderId_fkey'
  ) THEN
    ALTER TABLE "Sale"
    ADD CONSTRAINT "Sale_restaurantOrderId_fkey"
    FOREIGN KEY ("restaurantOrderId")
    REFERENCES "RestaurantOrder"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;
