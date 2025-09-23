/*
  Warnings:

  - You are about to drop the column `currency` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `stripeInvoiceId` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `checkoutRequestId` on the `MpesaTransaction` table. All the data in the column will be lost.
  - You are about to drop the column `key` on the `Permission` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `features` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `auditLogs` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `UserBranchRole` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `UserBranchRole` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `UserPermission` table. All the data in the column will be lost.
  - You are about to drop the column `permissionId` on the `UserPermission` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[number]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[checkoutRequestID]` on the table `MpesaTransaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[transactionId]` on the table `MpesaTransaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Permission` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,tenantId]` on the table `Role` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,branchId,roleId]` on the table `UserBranchRole` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,permission,tenantId]` on the table `UserPermission` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,roleId,tenantId]` on the table `UserRole` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `number` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `MpesaTransaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Permission` table without a default value. This is not possible if the table is not empty.
  - Made the column `description` on table `Plan` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `Role` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stripeCurrentPeriodEnd` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stripeCustomerId` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Made the column `stripePriceId` on table `Subscription` required. This step will fail if there are existing NULL values in that column.
  - Made the column `stripeSubscriptionId` on table `Subscription` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `tenantId` to the `UserBranchRole` table without a default value. This is not possible if the table is not empty.
  - Added the required column `permission` to the `UserPermission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `UserPermission` table without a default value. This is not possible if the table is not empty.
  - Made the column `grantedAt` on table `UserPermission` required. This step will fail if there are existing NULL values in that column.
  - Made the column `grantedBy` on table `UserPermission` required. This step will fail if there are existing NULL values in that column.

*/

-- DropForeignKey
ALTER TABLE "UserPermission" DROP CONSTRAINT "UserPermission_grantedBy_fkey";

-- DropForeignKey
ALTER TABLE "UserPermission" DROP CONSTRAINT "UserPermission_permissionId_fkey";

-- DropIndex
DROP INDEX "Invoice_stripeInvoiceId_key";

-- DropIndex
DROP INDEX "Permission_key_key";

-- DropIndex
DROP INDEX "Plan_name_key";

-- DropIndex
DROP INDEX "Subscription_planId_idx";

-- DropIndex
DROP INDEX "UserBranchRole_branchId_idx";

-- DropIndex
DROP INDEX "UserBranchRole_userId_idx";

-- DropIndex
DROP INDEX "UserPermission_userId_permissionId_key";

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "currency",
DROP COLUMN "description",
DROP COLUMN "stripeInvoiceId",
ADD COLUMN     "number" TEXT NOT NULL,
ALTER COLUMN "dueDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MpesaTransaction" DROP COLUMN "checkoutRequestId",
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
ALTER TABLE "Permission" DROP COLUMN "key",
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "createdAt",
DROP COLUMN "currency",
DROP COLUMN "features",
DROP COLUMN "updatedAt",
ALTER COLUMN "description" SET NOT NULL;

-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "tenantId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "stripeCurrentPeriodEnd" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "stripeCustomerId" TEXT NOT NULL,
ADD COLUMN     "trialEnd" TIMESTAMP(3),
ADD COLUMN     "trialStart" TIMESTAMP(3),
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "stripePriceId" SET NOT NULL,
ALTER COLUMN "stripeSubscriptionId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "auditLogs",
ADD COLUMN     "auditLogsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "credits" DOUBLE PRECISION DEFAULT 0;

-- AlterTable
ALTER TABLE "UserBranchRole" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "UserPermission" DROP COLUMN "note",
DROP COLUMN "permissionId",
ADD COLUMN     "permission" TEXT NOT NULL,
ADD COLUMN     "tenantId" TEXT NOT NULL,
ALTER COLUMN "grantedAt" SET NOT NULL,
ALTER COLUMN "grantedAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "grantedBy" SET NOT NULL;

-- CreateTable
CREATE TABLE "PlanFeature" (
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
CREATE TABLE "PlanFeatureOnPlan" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanFeatureOnPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
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
CREATE UNIQUE INDEX "PlanFeature_featureKey_key" ON "PlanFeature"("featureKey");

-- CreateIndex
CREATE UNIQUE INDEX "PlanFeatureOnPlan_planId_featureId_key" ON "PlanFeatureOnPlan"("planId", "featureId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE UNIQUE INDEX "MpesaTransaction_checkoutRequestID_key" ON "MpesaTransaction"("checkoutRequestID");

-- CreateIndex
CREATE UNIQUE INDEX "MpesaTransaction_transactionId_key" ON "MpesaTransaction"("transactionId");

-- CreateIndex
CREATE INDEX "MpesaTransaction_userId_idx" ON "MpesaTransaction"("userId");

-- CreateIndex
CREATE INDEX "MpesaTransaction_saleId_idx" ON "MpesaTransaction"("saleId");

-- CreateIndex
CREATE INDEX "MpesaTransaction_tenantId_idx" ON "MpesaTransaction"("tenantId");

-- CreateIndex
CREATE INDEX "MpesaTransaction_checkoutRequestID_idx" ON "MpesaTransaction"("checkoutRequestID");

-- CreateIndex
CREATE INDEX "MpesaTransaction_mpesaReceipt_idx" ON "MpesaTransaction"("mpesaReceipt");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE INDEX "Plan_name_idx" ON "Plan"("name");

-- CreateIndex
CREATE INDEX "Plan_isActive_idx" ON "Plan"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_tenantId_key" ON "Role"("name", "tenantId");

-- CreateIndex
CREATE INDEX "Subscription_stripeSubscriptionId_idx" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBranchRole_userId_branchId_roleId_key" ON "UserBranchRole"("userId", "branchId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_permission_tenantId_key" ON "UserPermission"("userId", "permission", "tenantId");

-- CreateIndex
CREATE INDEX "UserRole_userId_idx" ON "UserRole"("userId");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE INDEX "UserRole_tenantId_idx" ON "UserRole"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_tenantId_key" ON "UserRole"("userId", "roleId", "tenantId");

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_permission_fkey" FOREIGN KEY ("permission") REFERENCES "Permission"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MpesaTransaction" ADD CONSTRAINT "MpesaTransaction_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MpesaTransaction" ADD CONSTRAINT "MpesaTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFeatureOnPlan" ADD CONSTRAINT "PlanFeatureOnPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFeatureOnPlan" ADD CONSTRAINT "PlanFeatureOnPlan_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "PlanFeature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBranchRole" ADD CONSTRAINT "UserBranchRole_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
