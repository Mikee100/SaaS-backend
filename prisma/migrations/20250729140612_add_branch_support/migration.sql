-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "branchId" TEXT;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "branchId" TEXT;

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBranchRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBranchRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Branch_tenantId_idx" ON "Branch"("tenantId");

-- CreateIndex
CREATE INDEX "UserBranchRole_userId_idx" ON "UserBranchRole"("userId");

-- CreateIndex
CREATE INDEX "UserBranchRole_branchId_idx" ON "UserBranchRole"("branchId");

-- CreateIndex
CREATE INDEX "Product_branchId_idx" ON "Product"("branchId");

-- CreateIndex
CREATE INDEX "Sale_branchId_idx" ON "Sale"("branchId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBranchRole" ADD CONSTRAINT "UserBranchRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBranchRole" ADD CONSTRAINT "UserBranchRole_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBranchRole" ADD CONSTRAINT "UserBranchRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
