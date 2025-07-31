-- CreateTable
CREATE TABLE "TenantConfiguration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantConfiguration_tenantId_idx" ON "TenantConfiguration"("tenantId");

-- CreateIndex
CREATE INDEX "TenantConfiguration_category_idx" ON "TenantConfiguration"("category");

-- CreateIndex
CREATE INDEX "TenantConfiguration_key_idx" ON "TenantConfiguration"("key");

-- CreateIndex
CREATE UNIQUE INDEX "TenantConfiguration_tenantId_key_key" ON "TenantConfiguration"("tenantId", "key");

-- AddForeignKey
ALTER TABLE "TenantConfiguration" ADD CONSTRAINT "TenantConfiguration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
