-- Resolve migration drift: Sync database with current schema
-- This migration handles the differences between migration history and actual database state

-- ============================================
-- 0. Fix migration history: Update old migration name if it exists
-- ============================================
DO $$ 
BEGIN
    -- Update migration history if old migration name exists
    IF EXISTS (
        SELECT 1 FROM "_prisma_migrations" 
        WHERE migration_name = '20250108120000_resolve_drift'
    ) THEN
        UPDATE "_prisma_migrations" 
        SET migration_name = '20251030000000_resolve_drift'
        WHERE migration_name = '20250108120000_resolve_drift';
    END IF;
END $$;

-- ============================================
-- 1. Drop ProductCategory table if it exists
-- ============================================
DROP TABLE IF EXISTS "ProductCategory" CASCADE;

-- ============================================
-- 2. Remove categoryId from Product table if it exists
-- ============================================
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Product' AND column_name = 'categoryId'
    ) THEN
        ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_categoryId_fkey";
        DROP INDEX IF EXISTS "Product_categoryId_idx";
        ALTER TABLE "Product" DROP COLUMN IF EXISTS "categoryId";
    END IF;
END $$;

-- ============================================
-- 3. Create or Update ProductAttribute table structure
-- ============================================
-- Only create ProductAttribute if it doesn't exist (it may be created by a later migration)
-- If it exists, we'll update it in the DO block below
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ProductAttribute') THEN
        CREATE TABLE "ProductAttribute" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "displayName" TEXT,
            "type" TEXT NOT NULL DEFAULT 'text',
            "tenantId" TEXT NOT NULL,
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,

            CONSTRAINT "ProductAttribute_pkey" PRIMARY KEY ("id")
        );
        
        -- Create base indexes for ProductAttribute
        CREATE INDEX IF NOT EXISTS "ProductAttribute_tenantId_idx" ON "ProductAttribute"("tenantId");
        CREATE INDEX IF NOT EXISTS "ProductAttribute_isActive_idx" ON "ProductAttribute"("isActive");
        CREATE UNIQUE INDEX IF NOT EXISTS "ProductAttribute_name_tenantId_key" ON "ProductAttribute"("name", "tenantId");
        
        -- Add foreign key for ProductAttribute if it doesn't exist
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Tenant') THEN
            ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_tenantId_fkey" 
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- Update Conversation tenantId to be NOT NULL if it exists and is nullable
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Conversation') THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'Conversation' AND column_name = 'tenantId' AND is_nullable = 'YES'
        ) THEN
            ALTER TABLE "Conversation" ALTER COLUMN "tenantId" SET NOT NULL;
        END IF;
    END IF;
END $$;

-- Update existing ProductAttribute table if it has old structure
DO $$ 
BEGIN
    -- Remove old columns if they exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ProductAttribute' AND column_name = 'categoryId'
    ) THEN
        ALTER TABLE "ProductAttribute" DROP CONSTRAINT IF EXISTS "ProductAttribute_categoryId_fkey";
        DROP INDEX IF EXISTS "ProductAttribute_categoryId_idx";
        DROP INDEX IF EXISTS "ProductAttribute_name_categoryId_tenantId_key";
        ALTER TABLE "ProductAttribute" DROP COLUMN IF EXISTS "categoryId";
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ProductAttribute' AND column_name = 'required'
    ) THEN
        ALTER TABLE "ProductAttribute" DROP COLUMN IF EXISTS "required";
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ProductAttribute' AND column_name = 'values'
    ) THEN
        ALTER TABLE "ProductAttribute" DROP COLUMN IF EXISTS "values";
    END IF;
    
    -- Add new columns if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ProductAttribute' AND column_name = 'displayName'
    ) THEN
        ALTER TABLE "ProductAttribute" ADD COLUMN "displayName" TEXT;
    END IF;
    
    -- Update type default if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ProductAttribute' AND column_name = 'type'
    ) THEN
        ALTER TABLE "ProductAttribute" ALTER COLUMN "type" SET DEFAULT 'text';
    END IF;
    
    -- Drop old unique constraint if it exists
    DROP INDEX IF EXISTS "ProductAttribute_name_categoryId_tenantId_key";
END $$;

-- ============================================
-- 4. Create ProductAttributeValue table if it doesn't exist
-- ============================================
CREATE TABLE IF NOT EXISTS "ProductAttributeValue" (
    "id" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "displayName" TEXT,
    "color" TEXT,
    "image" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAttributeValue_pkey" PRIMARY KEY ("id")
);

-- Create indexes for ProductAttributeValue
CREATE INDEX IF NOT EXISTS "ProductAttributeValue_attributeId_idx" ON "ProductAttributeValue"("attributeId");
CREATE INDEX IF NOT EXISTS "ProductAttributeValue_isActive_idx" ON "ProductAttributeValue"("isActive");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductAttributeValue_attributeId_value_key" ON "ProductAttributeValue"("attributeId", "value");

-- Add foreign key for ProductAttributeValue
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ProductAttribute') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'ProductAttributeValue_attributeId_fkey'
        ) THEN
            ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_attributeId_fkey" 
            FOREIGN KEY ("attributeId") REFERENCES "ProductAttribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- ============================================
-- 5. Create Conversation table if it doesn't exist
-- ============================================
CREATE TABLE IF NOT EXISTS "Conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "title" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- Create indexes for Conversation
CREATE INDEX IF NOT EXISTS "Conversation_userId_idx" ON "Conversation"("userId");
CREATE INDEX IF NOT EXISTS "Conversation_tenantId_idx" ON "Conversation"("tenantId");
CREATE INDEX IF NOT EXISTS "Conversation_branchId_idx" ON "Conversation"("branchId");
CREATE INDEX IF NOT EXISTS "Conversation_isActive_idx" ON "Conversation"("isActive");

-- Add foreign key for Conversation
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'Conversation_userId_fkey'
        ) THEN
            ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- ============================================
-- 6. Create LoginHistory table if it doesn't exist
-- ============================================
CREATE TABLE IF NOT EXISTS "LoginHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "loginTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "failureReason" TEXT,

    CONSTRAINT "LoginHistory_pkey" PRIMARY KEY ("id")
);

-- Create indexes for LoginHistory
CREATE INDEX IF NOT EXISTS "LoginHistory_userId_idx" ON "LoginHistory"("userId");
CREATE INDEX IF NOT EXISTS "LoginHistory_tenantId_idx" ON "LoginHistory"("tenantId");
CREATE INDEX IF NOT EXISTS "LoginHistory_loginTime_idx" ON "LoginHistory"("loginTime");

-- Add foreign keys for LoginHistory
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'LoginHistory_userId_fkey'
        ) THEN
            ALTER TABLE "LoginHistory" ADD CONSTRAINT "LoginHistory_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Tenant') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'LoginHistory_tenantId_fkey'
        ) THEN
            ALTER TABLE "LoginHistory" ADD CONSTRAINT "LoginHistory_tenantId_fkey" 
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- ============================================
-- 7. Create UserPreference table if it doesn't exist
-- ============================================
CREATE TABLE IF NOT EXISTS "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "preferenceKey" TEXT NOT NULL,
    "preferenceValue" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- Create indexes for UserPreference
CREATE INDEX IF NOT EXISTS "UserPreference_userId_idx" ON "UserPreference"("userId");
CREATE INDEX IF NOT EXISTS "UserPreference_tenantId_idx" ON "UserPreference"("tenantId");
CREATE INDEX IF NOT EXISTS "UserPreference_preferenceKey_idx" ON "UserPreference"("preferenceKey");
CREATE UNIQUE INDEX IF NOT EXISTS "UserPreference_userId_tenantId_preferenceKey_key" ON "UserPreference"("userId", "tenantId", "preferenceKey");

-- Add foreign key for UserPreference
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'UserPreference_userId_fkey'
        ) THEN
            ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- ============================================
-- 8. Create SalaryScheme table if it doesn't exist
-- ============================================
CREATE TABLE IF NOT EXISTS "SalaryScheme" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "salaryAmount" DOUBLE PRECISION NOT NULL,
    "frequency" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "nextDueDate" TIMESTAMP(3),
    "lastPaidDate" TIMESTAMP(3),
    "branchId" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryScheme_pkey" PRIMARY KEY ("id")
);

-- Create indexes for SalaryScheme
CREATE INDEX IF NOT EXISTS "SalaryScheme_tenantId_idx" ON "SalaryScheme"("tenantId");
CREATE INDEX IF NOT EXISTS "SalaryScheme_userId_idx" ON "SalaryScheme"("userId");
CREATE INDEX IF NOT EXISTS "SalaryScheme_branchId_idx" ON "SalaryScheme"("branchId");
CREATE INDEX IF NOT EXISTS "SalaryScheme_isActive_idx" ON "SalaryScheme"("isActive");
CREATE INDEX IF NOT EXISTS "SalaryScheme_nextDueDate_idx" ON "SalaryScheme"("nextDueDate");

-- Add foreign keys for SalaryScheme
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Tenant') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'SalaryScheme_tenantId_fkey'
        ) THEN
            ALTER TABLE "SalaryScheme" ADD CONSTRAINT "SalaryScheme_tenantId_fkey" 
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'SalaryScheme_userId_fkey'
        ) THEN
            ALTER TABLE "SalaryScheme" ADD CONSTRAINT "SalaryScheme_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Branch') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'SalaryScheme_branchId_fkey'
        ) THEN
            ALTER TABLE "SalaryScheme" ADD CONSTRAINT "SalaryScheme_branchId_fkey" 
            FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- ============================================
-- 9. Update AIChatInteraction table
-- ============================================
DO $$ 
BEGIN
    -- Only modify if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AIChatInteraction') THEN
        -- Add columns if they don't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'AIChatInteraction' AND column_name = 'category'
        ) THEN
            ALTER TABLE "AIChatInteraction" ADD COLUMN "category" TEXT;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'AIChatInteraction' AND column_name = 'feedback'
        ) THEN
            ALTER TABLE "AIChatInteraction" ADD COLUMN "feedback" JSONB;
        END IF;
        
        -- Add indexes
        CREATE INDEX IF NOT EXISTS "AIChatInteraction_category_idx" ON "AIChatInteraction"("category");
        
        -- Add foreign key for conversationId if it doesn't exist
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Conversation') THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'AIChatInteraction_conversationId_fkey'
            ) THEN
                ALTER TABLE "AIChatInteraction" ADD CONSTRAINT "AIChatInteraction_conversationId_fkey" 
                FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;

-- ============================================
-- 10. Update ProductVariation table
-- ============================================
DO $$ 
BEGIN
    -- Only modify if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ProductVariation') THEN
        -- Add columns if they don't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'ProductVariation' AND column_name = 'barcode'
        ) THEN
            ALTER TABLE "ProductVariation" ADD COLUMN "barcode" TEXT;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'ProductVariation' AND column_name = 'weight'
        ) THEN
            ALTER TABLE "ProductVariation" ADD COLUMN "weight" DOUBLE PRECISION;
        END IF;
        
        -- Add index
        CREATE INDEX IF NOT EXISTS "ProductVariation_sku_idx" ON "ProductVariation"("sku");
    END IF;
END $$;

-- ============================================
-- 11. Update Product table indexes
-- ============================================
DO $$ 
BEGIN
    -- Only create indexes if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Product') THEN
        CREATE INDEX IF NOT EXISTS "Product_createdAt_idx" ON "Product"("createdAt");
        CREATE INDEX IF NOT EXISTS "Product_tenantId_branchId_idx" ON "Product"("tenantId", "branchId");
        CREATE INDEX IF NOT EXISTS "Product_tenantId_createdAt_idx" ON "Product"("tenantId", "createdAt");
        CREATE INDEX IF NOT EXISTS "Product_branchId_createdAt_idx" ON "Product"("branchId", "createdAt");
        CREATE INDEX IF NOT EXISTS "Product_tenantId_branchId_createdAt_idx" ON "Product"("tenantId", "branchId", "createdAt");
    END IF;
END $$;

