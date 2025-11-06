-- CreateTable
CREATE TABLE "SalesTarget" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "daily" DOUBLE PRECISION NOT NULL,
    "weekly" DOUBLE PRECISION NOT NULL,
    "monthly" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesTarget_tenantId_idx" ON "SalesTarget"("tenantId");

-- CreateIndex
CREATE INDEX "Tenant_name_idx" ON "Tenant"("name");

-- AddForeignKey
ALTER TABLE "SalesTarget" ADD CONSTRAINT "SalesTarget_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
