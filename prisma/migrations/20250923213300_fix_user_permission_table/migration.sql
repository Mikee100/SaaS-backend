-- Drop the existing UserPermission table if it exists
DROP TABLE IF EXISTS "UserPermission" CASCADE;

-- Recreate the UserPermission table with the correct schema
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserPermission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserPermission_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UserPermission_permission_fkey" FOREIGN KEY ("permission") REFERENCES "Permission"("name") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserPermission_userId_permission_tenantId_key" UNIQUE ("userId", "permission", "tenantId")
);

-- Create indexes
CREATE INDEX "UserPermission_userId_idx" ON "UserPermission"("userId");
CREATE INDEX "UserPermission_tenantId_idx" ON "UserPermission"("tenantId");
CREATE INDEX "UserPermission_permission_idx" ON "UserPermission"("permission");