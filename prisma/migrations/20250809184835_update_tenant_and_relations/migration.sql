/*
  Warnings:

  - You are about to drop the column `tenantId` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `discountAmount` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceNumber` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `items` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `taxAmount` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `isVerified` on the `PaymentMethod` table. All the data in the column will be lost.
  - You are about to drop the column `categoryId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `dashboardLogoUrl` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `emailLogoUrl` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `faviconUrl` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `loginLogoUrl` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `logoSettings` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `mobileLogoUrl` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `receiptLogoUrl` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionId` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `watermarkUrl` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `TenantConfiguration` table. All the data in the column will be lost.
  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[stripeInvoiceId]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeCustomerId]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.
  - Made the column `category` on table `TenantConfiguration` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";

-- DropIndex
DROP INDEX "Invoice_invoiceNumber_key";

-- DropIndex
DROP INDEX "Subscription_tenantId_key";

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "tenantId";

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "discountAmount",
DROP COLUMN "invoiceNumber",
DROP COLUMN "items",
DROP COLUMN "notes",
DROP COLUMN "taxAmount",
DROP COLUMN "totalAmount",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "stripeInvoiceId" TEXT,
ALTER COLUMN "currency" SET DEFAULT 'USD',
ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PaymentMethod" DROP COLUMN "isVerified",
ADD COLUMN     "expMonth" INTEGER,
ADD COLUMN     "expYear" INTEGER;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "categoryId";

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "dashboardLogoUrl",
DROP COLUMN "emailLogoUrl",
DROP COLUMN "faviconUrl",
DROP COLUMN "isActive",
DROP COLUMN "loginLogoUrl",
DROP COLUMN "logoSettings",
DROP COLUMN "mobileLogoUrl",
DROP COLUMN "receiptLogoUrl",
DROP COLUMN "subscriptionId",
DROP COLUMN "watermarkUrl",
ADD COLUMN     "annualRevenue" TEXT,
ADD COLUMN     "apiKey" TEXT,
ADD COLUMN     "auditLogs" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "backupRestore" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "businessCategory" TEXT,
ADD COLUMN     "businessDescription" TEXT,
ADD COLUMN     "businessHours" JSONB,
ADD COLUMN     "businessLicense" TEXT,
ADD COLUMN     "businessSubcategory" TEXT,
ADD COLUMN     "customDomain" TEXT,
ADD COLUMN     "customIntegrations" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "employeeCount" TEXT,
ADD COLUMN     "etimsQrUrl" TEXT,
ADD COLUMN     "favicon" TEXT,
ADD COLUMN     "foundedYear" INTEGER,
ADD COLUMN     "invoiceFooter" TEXT,
ADD COLUMN     "kraPin" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "primaryColor" TEXT,
ADD COLUMN     "primaryProducts" JSONB,
ADD COLUMN     "rateLimit" INTEGER,
ADD COLUMN     "receiptLogo" TEXT,
ADD COLUMN     "secondaryColor" TEXT,
ADD COLUMN     "secondaryProducts" JSONB,
ADD COLUMN     "socialMedia" JSONB,
ADD COLUMN     "ssoEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "watermark" TEXT,
ADD COLUMN     "webhookUrl" TEXT,
ADD COLUMN     "whiteLabel" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TenantConfiguration" DROP COLUMN "metadata",
ADD COLUMN     "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "category" SET NOT NULL,
ALTER COLUMN "category" DROP DEFAULT;

-- DropTable
DROP TABLE "Category";

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_stripeInvoiceId_key" ON "Invoice"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_idx" ON "Invoice"("tenantId");

-- CreateIndex
CREATE INDEX "Invoice_subscriptionId_idx" ON "Invoice"("subscriptionId");

-- CreateIndex
CREATE INDEX "PaymentMethod_tenantId_idx" ON "PaymentMethod"("tenantId");

-- CreateIndex
CREATE INDEX "Subscription_tenantId_idx" ON "Subscription"("tenantId");

-- CreateIndex
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_stripeCustomerId_key" ON "Tenant"("stripeCustomerId");
