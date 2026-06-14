-- Create missing restaurant activity table without relying on shadow DB validation.
CREATE TABLE IF NOT EXISTS "RestaurantActivityEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "orderId" TEXT,
  "actorUserId" TEXT,
  "actionType" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RestaurantActivityEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RestaurantActivityEvent_tenantId_createdAt_idx"
  ON "RestaurantActivityEvent"("tenantId", "createdAt");

CREATE INDEX IF NOT EXISTS "RestaurantActivityEvent_tenantId_branchId_createdAt_idx"
  ON "RestaurantActivityEvent"("tenantId", "branchId", "createdAt");

CREATE INDEX IF NOT EXISTS "RestaurantActivityEvent_orderId_createdAt_idx"
  ON "RestaurantActivityEvent"("orderId", "createdAt");

CREATE INDEX IF NOT EXISTS "RestaurantActivityEvent_actorUserId_createdAt_idx"
  ON "RestaurantActivityEvent"("actorUserId", "createdAt");

DO $$
BEGIN
  IF to_regclass('"Tenant"') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RestaurantActivityEvent_tenantId_fkey'
  ) THEN
    ALTER TABLE "RestaurantActivityEvent"
      ADD CONSTRAINT "RestaurantActivityEvent_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF to_regclass('"Branch"') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RestaurantActivityEvent_branchId_fkey'
  ) THEN
    ALTER TABLE "RestaurantActivityEvent"
      ADD CONSTRAINT "RestaurantActivityEvent_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF to_regclass('"RestaurantOrder"') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RestaurantActivityEvent_orderId_fkey'
  ) THEN
    ALTER TABLE "RestaurantActivityEvent"
      ADD CONSTRAINT "RestaurantActivityEvent_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "RestaurantOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF to_regclass('"User"') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RestaurantActivityEvent_actorUserId_fkey'
  ) THEN
    ALTER TABLE "RestaurantActivityEvent"
      ADD CONSTRAINT "RestaurantActivityEvent_actorUserId_fkey"
      FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
