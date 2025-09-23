/*
  Warnings:

  - You are about to drop the column `currency` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceNumber` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `checkoutRequestId` on the `MpesaTransaction` table. All the data in the column will be lost.
  - You are about to drop the column `key` on the `Permission` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `features` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `cancelledAt` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the `UserPermission` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[number]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[checkoutRequestID]` on the table `MpesaTransaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[transactionId]` on the table `MpesaTransaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Permission` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripePriceId]` on the table `Plan` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,tenantId]` on the table `Role` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeCustomerId]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,roleId,tenantId]` on the table `UserRole` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `number` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `MpesaTransaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Permission` table without a default value. This is not possible if the table is not empty.
  - Made the column `description` on table `Plan` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `Role` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stripeCurrentPeriodEnd` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stripeCustomerId` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stripePriceId` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stripeSubscriptionId` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Invoice" DROP CONSTRAINT "Invoice_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Sale" DROP CONSTRAINT "Sale_mpesaTransactionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserPermission" DROP CONSTRAINT "UserPermission_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserPermission" DROP CONSTRAINT "UserPermission_userId_fkey";

-- DropIndex
DROP INDEX "public"."Invoice_invoiceNumber_key";

-- DropIndex
DROP INDEX "public"."Permission_key_key";

-- DropIndex
DROP INDEX "public"."Plan_name_key";

-- DropIndex
DROP INDEX "public"."Subscription_planId_idx";

-- AlterTable
ALTER TABLE "public"."Inventory" ADD COLUMN     "branchId" TEXT;

-- AlterTable
ALTER TABLE "public"."Invoice" DROP COLUMN "currency",
DROP COLUMN "description",
DROP COLUMN "invoiceNumber",
DROP COLUMN "metadata",
ADD COLUMN     "number" TEXT NOT NULL,
ADD COLUMN     "tenantId" TEXT NOT NULL,
ALTER COLUMN "subscriptionId" DROP NOT NULL,
ALTER COLUMN "dueDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."MpesaTransaction" DROP COLUMN "checkoutRequestId",
ADD COLUMN     "billRefNumber" TEXT,
ADD COLUMN     "businessShortCode" TEXT,
ADD COLUMN     "checkoutRequestID" TEXT,
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "orgAccountBalance" TEXT,
ADD COLUMN     "saleId" TEXT,
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "thirdPartyTransID" TEXT,
ADD COLUMN     "transactionId" TEXT,
ADD COLUMN     "transactionTime" TIMESTAMP(3),
ADD COLUMN     "transactionType" TEXT,
ALTER COLUMN "status" SET DEFAULT 'pending';

-- AlterTable
ALTER TABLE "public"."Permission" DROP COLUMN "key",
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Plan" DROP COLUMN "createdAt",
DROP COLUMN "currency",
DROP COLUMN "features",
DROP COLUMN "updatedAt",
ADD COLUMN     "advancedSecurity" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "auditLogs" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "backupRestore" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bulkOperations" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "customFields" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "customIntegrations" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dataExport" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dedicatedSupport" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ssoEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripePriceId" TEXT,
ADD COLUMN     "whiteLabel" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "description" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "cost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."Role" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "tenantId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."Sale" ADD COLUMN     "branchId" TEXT;

-- AlterTable
ALTER TABLE "public"."Subscription" DROP COLUMN "cancelledAt",
DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "stripeCurrentPeriodEnd" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "stripeCustomerId" TEXT NOT NULL,
ADD COLUMN     "stripePriceId" TEXT NOT NULL,
ADD COLUMN     "stripeSubscriptionId" TEXT NOT NULL,
ADD COLUMN     "trialStart" TIMESTAMP(3),
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Tenant" ADD COLUMN     "annualRevenue" TEXT,
ADD COLUMN     "apiKey" TEXT,
ADD COLUMN     "auditLogsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "backupRestore" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "businessCategory" TEXT,
ADD COLUMN     "businessDescription" TEXT,
ADD COLUMN     "businessHours" JSONB,
ADD COLUMN     "businessLicense" TEXT,
ADD COLUMN     "businessSubcategory" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "credits" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "customDomain" TEXT,
ADD COLUMN     "customIntegrations" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dashboardLogoUrl" TEXT,
ADD COLUMN     "emailLogoUrl" TEXT,
ADD COLUMN     "employeeCount" TEXT,
ADD COLUMN     "favicon" TEXT,
ADD COLUMN     "foundedYear" INTEGER,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "loginLogoUrl" TEXT,
ADD COLUMN     "logoSettings" JSONB,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "mobileLogoUrl" TEXT,
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
ADD COLUMN     "taxId" TEXT,
ADD COLUMN     "watermark" TEXT,
ADD COLUMN     "webhookUrl" TEXT,
ADD COLUMN     "website" TEXT,
ADD COLUMN     "whiteLabel" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "currency" SET DEFAULT 'KES',
ALTER COLUMN "timezone" SET DEFAULT 'Africa/Nairobi';

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "isSuperadmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tenantId" TEXT;

-- DropTable
DROP TABLE "public"."UserPermission";

-- CreateTable
CREATE TABLE "public"."PlanFeature" (
    "id" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "featureName" TEXT NOT NULL,
    "featureDescription" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlanFeatureOnPlan" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stripePriceId" TEXT,

    CONSTRAINT "PlanFeatureOnPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "completedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "refundAmount" DOUBLE PRECISION,
    "refundReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "manager" TEXT,
    "openingHours" TEXT,
    "status" TEXT,
    "logo" TEXT,
    "customField" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserBranchRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "UserBranchRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemConfiguration" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TenantConfiguration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanFeature_featureKey_key" ON "public"."PlanFeature"("featureKey");

-- CreateIndex
CREATE UNIQUE INDEX "PlanFeatureOnPlan_stripePriceId_key" ON "public"."PlanFeatureOnPlan"("stripePriceId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "public"."Payment"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Payment_tenantId_idx" ON "public"."Payment"("tenantId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "public"."Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "public"."Payment"("createdAt");

-- CreateIndex
CREATE INDEX "Branch_tenantId_idx" ON "public"."Branch"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBranchRole_userId_branchId_roleId_key" ON "public"."UserBranchRole"("userId", "branchId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfiguration_key_key" ON "public"."SystemConfiguration"("key");

-- CreateIndex
CREATE INDEX "SystemConfiguration_category_idx" ON "public"."SystemConfiguration"("category");

-- CreateIndex
CREATE INDEX "SystemConfiguration_key_idx" ON "public"."SystemConfiguration"("key");

-- CreateIndex
CREATE INDEX "TenantConfiguration_tenantId_idx" ON "public"."TenantConfiguration"("tenantId");

-- CreateIndex
CREATE INDEX "TenantConfiguration_category_idx" ON "public"."TenantConfiguration"("category");

-- CreateIndex
CREATE INDEX "TenantConfiguration_key_idx" ON "public"."TenantConfiguration"("key");

-- CreateIndex
CREATE UNIQUE INDEX "TenantConfiguration_tenantId_key_key" ON "public"."TenantConfiguration"("tenantId", "key");

-- CreateIndex
CREATE INDEX "Inventory_branchId_idx" ON "public"."Inventory"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "public"."Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_idx" ON "public"."Invoice"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "MpesaTransaction_checkoutRequestID_key" ON "public"."MpesaTransaction"("checkoutRequestID");

-- CreateIndex
CREATE UNIQUE INDEX "MpesaTransaction_transactionId_key" ON "public"."MpesaTransaction"("transactionId");

-- CreateIndex
CREATE INDEX "MpesaTransaction_userId_idx" ON "public"."MpesaTransaction"("userId");

-- CreateIndex
CREATE INDEX "MpesaTransaction_saleId_idx" ON "public"."MpesaTransaction"("saleId");

-- CreateIndex
CREATE INDEX "MpesaTransaction_tenantId_idx" ON "public"."MpesaTransaction"("tenantId");

-- CreateIndex
CREATE INDEX "MpesaTransaction_checkoutRequestID_idx" ON "public"."MpesaTransaction"("checkoutRequestID");

-- CreateIndex
CREATE INDEX "MpesaTransaction_mpesaReceipt_idx" ON "public"."MpesaTransaction"("mpesaReceipt");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "public"."Permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_stripePriceId_key" ON "public"."Plan"("stripePriceId");

-- CreateIndex
CREATE INDEX "Plan_name_idx" ON "public"."Plan"("name");

-- CreateIndex
CREATE INDEX "Plan_isActive_idx" ON "public"."Plan"("isActive");

-- CreateIndex
CREATE INDEX "Product_branchId_idx" ON "public"."Product"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_tenantId_key" ON "public"."Role"("name", "tenantId");

-- CreateIndex
CREATE INDEX "Sale_branchId_idx" ON "public"."Sale"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "public"."Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_stripeSubscriptionId_idx" ON "public"."Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_stripeCustomerId_idx" ON "public"."Subscription"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "public"."Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "public"."Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_stripeCustomerId_key" ON "public"."Tenant"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_resetPasswordToken_idx" ON "public"."User"("resetPasswordToken");

-- CreateIndex
CREATE INDEX "User_branchId_idx" ON "public"."User"("branchId");

-- CreateIndex
CREATE INDEX "UserRole_userId_idx" ON "public"."UserRole"("userId");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "public"."UserRole"("roleId");

-- CreateIndex
CREATE INDEX "UserRole_tenantId_idx" ON "public"."UserRole"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_tenantId_key" ON "public"."UserRole"("userId", "roleId", "tenantId");

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Inventory" ADD CONSTRAINT "Inventory_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sale" ADD CONSTRAINT "Sale_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MpesaTransaction" ADD CONSTRAINT "MpesaTransaction_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "public"."Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MpesaTransaction" ADD CONSTRAINT "MpesaTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlanFeatureOnPlan" ADD CONSTRAINT "PlanFeatureOnPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlanFeatureOnPlan" ADD CONSTRAINT "PlanFeatureOnPlan_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "public"."PlanFeature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Branch" ADD CONSTRAINT "Branch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserBranchRole" ADD CONSTRAINT "UserBranchRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserBranchRole" ADD CONSTRAINT "UserBranchRole_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserBranchRole" ADD CONSTRAINT "UserBranchRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserBranchRole" ADD CONSTRAINT "UserBranchRole_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TenantConfiguration" ADD CONSTRAINT "TenantConfiguration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
