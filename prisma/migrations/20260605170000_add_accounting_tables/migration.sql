-- Create missing accounting tables for environments that were baselined without them.

CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subtype" TEXT,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "JournalEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LedgerEntry" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,
    "tag" TEXT DEFAULT 'general',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Account_tenantId_code_key" ON "Account"("tenantId", "code");
CREATE INDEX IF NOT EXISTS "Account_tenantId_idx" ON "Account"("tenantId");

CREATE INDEX IF NOT EXISTS "JournalEntry_tenantId_idx" ON "JournalEntry"("tenantId");
CREATE INDEX IF NOT EXISTS "JournalEntry_date_idx" ON "JournalEntry"("date");

CREATE INDEX IF NOT EXISTS "LedgerEntry_journalEntryId_idx" ON "LedgerEntry"("journalEntryId");
CREATE INDEX IF NOT EXISTS "LedgerEntry_accountId_idx" ON "LedgerEntry"("accountId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Account_tenantId_fkey'
    ) THEN
        ALTER TABLE "Account"
            ADD CONSTRAINT "Account_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'JournalEntry_tenantId_fkey'
    ) THEN
        ALTER TABLE "JournalEntry"
            ADD CONSTRAINT "JournalEntry_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'JournalEntry_userId_fkey'
    ) THEN
        ALTER TABLE "JournalEntry"
            ADD CONSTRAINT "JournalEntry_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LedgerEntry_journalEntryId_fkey'
    ) THEN
        ALTER TABLE "LedgerEntry"
            ADD CONSTRAINT "LedgerEntry_journalEntryId_fkey"
            FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LedgerEntry_accountId_fkey'
    ) THEN
        ALTER TABLE "LedgerEntry"
            ADD CONSTRAINT "LedgerEntry_accountId_fkey"
            FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
