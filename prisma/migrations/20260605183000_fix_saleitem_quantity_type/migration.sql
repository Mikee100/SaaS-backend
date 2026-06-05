-- Align SaleItem.quantity type with Prisma schema (Float -> DOUBLE PRECISION)
-- Some production databases still have INTEGER, which causes Prisma bind errors.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'SaleItem'
      AND column_name = 'quantity'
      AND data_type <> 'double precision'
  ) THEN
    ALTER TABLE "SaleItem"
      ALTER COLUMN "quantity" TYPE DOUBLE PRECISION
      USING "quantity"::double precision;
  END IF;
END $$;
