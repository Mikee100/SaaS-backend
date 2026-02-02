-- AlterTable (IF NOT EXISTS for idempotency if column was added by old 20250201120000 migration)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "preferences" JSONB;
