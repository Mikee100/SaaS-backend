-- Prune unused Prisma models/tables verified as orphaned in application code.
-- NOTE: This is destructive. Ensure a DB backup exists before applying in production.

DROP TABLE IF EXISTS "ProductAdditionRecord" CASCADE;
DROP TABLE IF EXISTS "UserBranchRole" CASCADE;
DROP TABLE IF EXISTS "TenantModule" CASCADE;
DROP TABLE IF EXISTS "UserPreference" CASCADE;
