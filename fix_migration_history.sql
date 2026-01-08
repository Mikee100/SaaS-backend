-- Fix migration history: Update old migration name to new one
-- Run this directly on your database

UPDATE "_prisma_migrations" 
SET migration_name = '20251030000000_resolve_drift'
WHERE migration_name = '20250108120000_resolve_drift';

