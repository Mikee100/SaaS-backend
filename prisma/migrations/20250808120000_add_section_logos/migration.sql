-- Add missing logo fields to tenant table
ALTER TABLE "Tenant" 
ADD COLUMN IF NOT EXISTS "faviconUrl" TEXT,
ADD COLUMN IF NOT EXISTS "receiptLogoUrl" TEXT,
ADD COLUMN IF NOT EXISTS "watermarkUrl" TEXT,
ADD COLUMN IF NOT EXISTS "loginLogoUrl" TEXT,
ADD COLUMN IF NOT EXISTS "dashboardLogoUrl" TEXT,
ADD COLUMN IF NOT EXISTS "emailLogoUrl" TEXT,
ADD COLUMN IF NOT EXISTS "mobileLogoUrl" TEXT;

-- Add logo settings JSON field for flexible configuration
ALTER TABLE "Tenant" 
ADD COLUMN IF NOT EXISTS "logoSettings" JSONB DEFAULT '{}';
