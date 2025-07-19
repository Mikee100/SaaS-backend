-- AlterTable
ALTER TABLE "UserPermission" ADD COLUMN     "grantedAt" TIMESTAMP(3),
ADD COLUMN     "grantedBy" TEXT,
ADD COLUMN     "note" TEXT;
