/*
  Warnings:

  - You are about to drop the column `dashboardPreferences` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `themePreferences` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stripePriceId]` on the table `Plan` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripePriceId]` on the table `PlanFeatureOnPlan` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."PlanFeatureOnPlan_planId_featureId_key";

-- AlterTable
ALTER TABLE "public"."Plan" ADD COLUMN     "stripePriceId" TEXT;

-- AlterTable
ALTER TABLE "public"."PlanFeatureOnPlan" ADD COLUMN     "stripePriceId" TEXT;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "dashboardPreferences",
DROP COLUMN "themePreferences";

-- CreateIndex
CREATE UNIQUE INDEX "Plan_stripePriceId_key" ON "public"."Plan"("stripePriceId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanFeatureOnPlan_stripePriceId_key" ON "public"."PlanFeatureOnPlan"("stripePriceId");
