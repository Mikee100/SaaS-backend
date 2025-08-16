/*
  Warnings:

  - You are about to drop the column `description` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `stripeInvoiceId` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `expMonth` on the `PaymentMethod` table. All the data in the column will be lost.
  - You are about to drop the column `expYear` on the `PaymentMethod` table. All the data in the column will be lost.
  - You are about to drop the column `annualRevenue` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `apiKey` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `auditLogs` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `backupRestore` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `businessCategory` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `businessDescription` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `businessHours` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `businessLicense` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `businessSubcategory` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `customDomain` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `customIntegrations` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `employeeCount` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `etimsQrUrl` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `favicon` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `foundedYear` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceFooter` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `kraPin` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `postalCode` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `primaryColor` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `primaryProducts` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `rateLimit` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `receiptLogo` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `secondaryColor` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `secondaryProducts` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `socialMedia` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `ssoEnabled` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCustomerId` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `watermark` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `webhookUrl` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `whiteLabel` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `isEncrypted` on the `TenantConfiguration` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[invoiceNumber]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenantId` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `invoiceNumber` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `items` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Invoice_stripeInvoiceId_key";

-- DropIndex
DROP INDEX "Invoice_subscriptionId_idx";

-- DropIndex
DROP INDEX "Invoice_tenantId_idx";

-- DropIndex
DROP INDEX "PaymentMethod_tenantId_idx";

-- DropIndex
DROP INDEX "Subscription_planId_idx";

-- DropIndex
DROP INDEX "Subscription_tenantId_idx";

-- DropIndex
DROP INDEX "Tenant_stripeCustomerId_key";

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "description",
DROP COLUMN "stripeInvoiceId",
ADD COLUMN     "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "invoiceNumber" TEXT NOT NULL,
ADD COLUMN     "items" JSONB NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalAmount" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "currency" SET DEFAULT 'KES',
ALTER COLUMN "status" SET DEFAULT 'pending';

-- AlterTable
ALTER TABLE "PaymentMethod" DROP COLUMN "expMonth",
DROP COLUMN "expYear",
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "categoryId" TEXT;

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "annualRevenue",
DROP COLUMN "apiKey",
DROP COLUMN "auditLogs",
DROP COLUMN "backupRestore",
DROP COLUMN "businessCategory",
DROP COLUMN "businessDescription",
DROP COLUMN "businessHours",
DROP COLUMN "businessLicense",
DROP COLUMN "businessSubcategory",
DROP COLUMN "customDomain",
DROP COLUMN "customIntegrations",
DROP COLUMN "employeeCount",
DROP COLUMN "etimsQrUrl",
DROP COLUMN "favicon",
DROP COLUMN "foundedYear",
DROP COLUMN "invoiceFooter",
DROP COLUMN "kraPin",
DROP COLUMN "latitude",
DROP COLUMN "longitude",
DROP COLUMN "postalCode",
DROP COLUMN "primaryColor",
DROP COLUMN "primaryProducts",
DROP COLUMN "rateLimit",
DROP COLUMN "receiptLogo",
DROP COLUMN "secondaryColor",
DROP COLUMN "secondaryProducts",
DROP COLUMN "socialMedia",
DROP COLUMN "ssoEnabled",
DROP COLUMN "state",
DROP COLUMN "stripeCustomerId",
DROP COLUMN "watermark",
DROP COLUMN "webhookUrl",
DROP COLUMN "whiteLabel",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "subscriptionId" TEXT;

-- AlterTable
ALTER TABLE "TenantConfiguration" DROP COLUMN "isEncrypted",
ADD COLUMN     "metadata" JSONB,
ALTER COLUMN "category" DROP NOT NULL,
ALTER COLUMN "category" SET DEFAULT 'general';

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_tenantId_key" ON "Category"("name", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_tenantId_key" ON "Subscription"("tenantId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
