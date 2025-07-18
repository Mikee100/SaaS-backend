/*
  Warnings:

  - A unique constraint covering the columns `[mpesaTransactionId]` on the table `Sale` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "mpesaTransactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Sale_mpesaTransactionId_key" ON "Sale"("mpesaTransactionId");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_mpesaTransactionId_fkey" FOREIGN KEY ("mpesaTransactionId") REFERENCES "MpesaTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
