-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "advancedSecurity" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "auditLogs" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "backupRestore" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bulkOperations" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "customFields" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "customIntegrations" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dataExport" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dedicatedSupport" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ssoEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whiteLabel" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "apiKey" TEXT,
ADD COLUMN     "auditLogs" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "backupRestore" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "customDomain" TEXT,
ADD COLUMN     "customIntegrations" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "primaryColor" TEXT,
ADD COLUMN     "rateLimit" INTEGER,
ADD COLUMN     "secondaryColor" TEXT,
ADD COLUMN     "ssoEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "webhookUrl" TEXT,
ADD COLUMN     "whiteLabel" BOOLEAN NOT NULL DEFAULT false;
