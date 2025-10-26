/*
  Warnings:

  - A unique constraint covering the columns `[name,parentId,tenantId]` on the table `ProductCategory` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."ProductCategory_name_tenantId_key";

-- AlterTable
ALTER TABLE "ProductCategory" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "ProductCategory_parentId_idx" ON "ProductCategory"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_name_parentId_tenantId_key" ON "ProductCategory"("name", "parentId", "tenantId");

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
