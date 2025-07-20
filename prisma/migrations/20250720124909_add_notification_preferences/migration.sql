-- AlterTable
ALTER TABLE "User" ADD COLUMN     "language" TEXT,
ADD COLUMN     "notificationPreferences" JSONB,
ADD COLUMN     "region" TEXT;
