-- AlterTable
ALTER TABLE "public"."Inventory" ADD COLUMN     "branchId" TEXT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "branchId" TEXT;

-- CreateIndex
CREATE INDEX "Inventory_branchId_idx" ON "public"."Inventory"("branchId");

-- CreateIndex
CREATE INDEX "User_branchId_idx" ON "public"."User"("branchId");

-- AddForeignKey
ALTER TABLE "public"."Inventory" ADD CONSTRAINT "Inventory_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
