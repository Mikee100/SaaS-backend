/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey,userId]` on the table `Sale` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Sale_idempotencyKey_userId_key" ON "Sale"("idempotencyKey", "userId");
