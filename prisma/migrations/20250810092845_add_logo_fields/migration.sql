-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "dashboardLogoUrl" TEXT,
ADD COLUMN     "emailLogoUrl" TEXT,
ADD COLUMN     "loginLogoUrl" TEXT,
ADD COLUMN     "logoSettings" JSONB,
ADD COLUMN     "mobileLogoUrl" TEXT;
