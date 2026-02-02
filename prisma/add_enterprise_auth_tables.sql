-- Add enterprise auth tables (AuthDevice, AuthSession) if they don't exist.
-- Easiest: from backend folder run:  npx prisma db push
-- Or run this file:  psql <your-connection-string> -f prisma/add_enterprise_auth_tables.sql

-- AuthDevice must exist before AuthSession (FK from AuthSession to AuthDevice)
CREATE TABLE IF NOT EXISTS "AuthDevice" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "name" TEXT,
  "trusted" BOOLEAN NOT NULL DEFAULT false,
  "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuthDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AuthDevice_userId_fingerprint_key" ON "AuthDevice"("userId", "fingerprint");
CREATE INDEX IF NOT EXISTS "AuthDevice_userId_idx" ON "AuthDevice"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'AuthDevice_userId_fkey'
  ) THEN
    ALTER TABLE "AuthDevice" ADD CONSTRAINT "AuthDevice_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AuthSession
CREATE TABLE IF NOT EXISTS "AuthSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tenantId" TEXT,
  "deviceId" TEXT,
  "refreshTokenHash" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "isValid" BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuthSession_userId_idx" ON "AuthSession"("userId");
CREATE INDEX IF NOT EXISTS "AuthSession_userId_isValid_idx" ON "AuthSession"("userId", "isValid");
CREATE INDEX IF NOT EXISTS "AuthSession_refreshTokenHash_idx" ON "AuthSession"("refreshTokenHash");
CREATE INDEX IF NOT EXISTS "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'AuthSession_userId_fkey'
  ) THEN
    ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'AuthSession_deviceId_fkey'
  ) THEN
    ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_deviceId_fkey"
      FOREIGN KEY ("deviceId") REFERENCES "AuthDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
