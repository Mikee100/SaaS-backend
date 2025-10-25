-- AlterTable
ALTER TABLE "ProductCategory" ADD COLUMN     "branchId" TEXT;

-- CreateIndex
CREATE INDEX "ProductCategory_branchId_idx" ON "ProductCategory"("branchId");

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
