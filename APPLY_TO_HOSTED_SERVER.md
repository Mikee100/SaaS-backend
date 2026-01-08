# Apply Drift Resolution Migration to Hosted Server

## Prerequisites
- SSH access to the hosted server
- Database access (via psql or your database client)
- Backup of the database (recommended)

## Steps

### 1. Copy Migration to Hosted Server

Copy the migration folder to your hosted server:

```bash
# From your local machine, use SCP or your preferred method
scp -r backend/prisma/migrations/20251030000000_resolve_drift ubuntu@your-server-ip:~/SaaS-backend/prisma/migrations/
```

Or if you're using git:
```bash
# Commit and push the migration
git add backend/prisma/migrations/20251030000000_resolve_drift
git commit -m "Add drift resolution migration"
git push

# On hosted server, pull the changes
cd ~/SaaS-backend
git pull
```

### 2. Connect to Hosted Server

```bash
ssh ubuntu@your-server-ip
cd ~/SaaS-backend
```

### 3. Review the Migration (Optional but Recommended)

Check what the migration will do:
```bash
cat prisma/migrations/20251030000000_resolve_drift/migration.sql
```

### 4. Apply the Migration

You have two options:

#### Option A: Mark as Applied (If changes already exist in DB)
If your hosted database already has the tables (SalaryScheme, etc.) but the migration history is out of sync:

```bash
npx prisma migrate resolve --applied 20251030000000_resolve_drift
```

#### Option B: Run the Migration SQL Directly
If you want to ensure all changes are applied:

```bash
# Connect to your database
psql -h localhost -U your_user -d saas_platform

# Then run the migration SQL
\i prisma/migrations/20251030000000_resolve_drift/migration.sql

# Or if using environment variables
psql $DATABASE_URL -f prisma/migrations/20251030000000_resolve_drift/migration.sql
```

Then mark it as applied:
```bash
npx prisma migrate resolve --applied 20251030000000_resolve_drift
```

### 5. Verify Migration Status

```bash
npx prisma migrate status
```

You should see:
```
Database schema is up to date!
```

### 6. Test Creating a New Migration (Optional)

Verify you can create new migrations without drift:
```bash
npx prisma migrate dev --create-only --name test_no_drift
```

If successful, delete the test migration:
```bash
rm -rf prisma/migrations/*test_no_drift*
```

## Troubleshooting

### If you get "migration already applied" error:
The migration history might reference the old name. Run this SQL on your database:

```sql
UPDATE "_prisma_migrations" 
SET migration_name = '20251030000000_resolve_drift'
WHERE migration_name = '20250108120000_resolve_drift';
```

### If you get drift errors:
The migration is idempotent, so you can run it multiple times safely. The `IF EXISTS` and `IF NOT EXISTS` checks ensure it won't break if run again.

### If tables already exist:
The migration uses `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE` with existence checks, so it's safe to run even if tables already exist.

## Safety Notes

- ✅ The migration is **idempotent** - safe to run multiple times
- ✅ Uses `IF EXISTS` / `IF NOT EXISTS` checks
- ✅ Won't drop data (only drops ProductCategory which doesn't exist in your DB)
- ✅ Only adds missing tables, indexes, and foreign keys
- ⚠️ Always backup your database before running migrations on production

## Rollback (if needed)

If something goes wrong, you can manually revert changes, but since this migration only:
- Adds tables/indexes/foreign keys
- Drops ProductCategory (which doesn't exist)
- Removes categoryId (which doesn't exist)

There's minimal risk. The migration is designed to be safe for production use.

