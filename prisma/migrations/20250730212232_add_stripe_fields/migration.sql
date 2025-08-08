/*
  Warnings:

  - You are about to drop the column `description` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceNumber` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `cancelledAt` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `trialEnd` on the `Subscription` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stripeInvoiceId]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenantId` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_subscriptionId_fkey";

-- DropIndex
DROP INDEX "Invoice_invoiceNumber_key";

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "description",
DROP COLUMN "invoiceNumber",
DROP COLUMN "metadata",
ADD COLUMN     "stripeInvoiceId" TEXT,
ADD COLUMN     "tenantId" TEXT NOT NULL,
ALTER COLUMN "subscriptionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "cancelledAt",
DROP COLUMN "trialEnd",
ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "stripePriceId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'active';

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "stripeCustomerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_stripeInvoiceId_key" ON "Invoice"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_idx" ON "Invoice"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
