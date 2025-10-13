-- AlterTable
ALTER TABLE "AIChatInteraction" ADD COLUMN     "conversationId" TEXT;

-- CreateIndex
CREATE INDEX "AIChatInteraction_conversationId_idx" ON "AIChatInteraction"("conversationId");
