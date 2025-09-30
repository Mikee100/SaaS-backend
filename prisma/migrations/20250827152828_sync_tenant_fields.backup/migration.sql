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





-- AlterTable
ALTER TABLE "public"."Invoice" ALTER COLUMN "subscriptionId" DROP NOT NULL,
ALTER COLUMN "dueDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."MpesaTransaction"
ALTER COLUMN "status" SET DEFAULT 'pending';

-- AlterTable
-- Permission table changes already applied

-- AlterTable
-- Plan table changes already applied

-- AlterTable
-- Product table changes already applied

-- AlterTable
-- Role table changes already applied

-- AlterTable
-- Sale table changes already applied

-- AlterTable
-- Subscription table changes already applied

-- AlterTable
-- Tenant table changes already applied

-- AlterTable
-- User table changes already applied

-- DropTable
DROP TABLE "public"."UserPermission";

-- CreateTable
-- PlanFeature table creation already applied

-- CreateTable
-- PlanFeatureOnPlan table creation already applied

-- CreateTable
-- Payment table creation already applied

-- CreateTable
-- Branch table creation already applied

-- CreateTable
-- UserBranchRole table creation already applied

-- CreateTable
-- SystemConfiguration table creation already applied

-- CreateTable
-- TenantConfiguration table creation already applied

-- CreateTable
-- Notification table creation already applied

-- CreateIndex statements already applied

-- AddForeignKey statements already applied
