-- DropForeignKey
ALTER TABLE "public"."Subscription" DROP CONSTRAINT "Subscription_userId_fkey";

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AIChatInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "userMessage" TEXT NOT NULL,
    "aiResponse" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIChatInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIChatInteraction_userId_idx" ON "AIChatInteraction"("userId");

-- CreateIndex
CREATE INDEX "AIChatInteraction_tenantId_idx" ON "AIChatInteraction"("tenantId");

-- CreateIndex
CREATE INDEX "AIChatInteraction_branchId_idx" ON "AIChatInteraction"("branchId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
