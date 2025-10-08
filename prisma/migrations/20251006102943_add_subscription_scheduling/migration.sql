-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "scheduledEffectiveDate" TIMESTAMP(3),
ADD COLUMN     "scheduledPlanId" TEXT;

-- CreateIndex
CREATE INDEX "Subscription_scheduledPlanId_idx" ON "Subscription"("scheduledPlanId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_scheduledPlanId_fkey" FOREIGN KEY ("scheduledPlanId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
