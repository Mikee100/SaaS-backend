# Apply Migrations to Hosted Server (After Reset)

Since you've reset the database on the hosted server, we need to apply all migrations from scratch.

## Steps

### 1. Ensure All Migrations Are on the Server

Make sure the `20251030000000_resolve_drift` migration folder is on the hosted server:

```bash
# On your local machine, commit and push if using git
git add backend/prisma/migrations/20251030000000_resolve_drift
git commit -m "Add drift resolution migration"
git push

# On hosted server
cd ~/SaaS-backend
git pull
```

Or copy directly:
```bash
# From local machine
scp -r backend/prisma/migrations/20251030000000_resolve_drift ubuntu@your-server:~/SaaS-backend/prisma/migrations/
```

### 2. Connect to Hosted Server

```bash
ssh ubuntu@your-server-ip
cd ~/SaaS-backend
```

### 3. Apply All Migrations

Since the database was reset, apply all migrations:

```bash
# This will apply all migrations in order
npx prisma migrate deploy
```

This will:
- Apply all migrations from the beginning
- Include the drift resolution migration
- Set up the complete database schema

### 4. Verify Migration Status

```bash
npx prisma migrate status
```

You should see:
```
Database schema is up to date!
```

### 5. Generate Prisma Client (if needed)

```bash
npx prisma generate
```

### 6. (Optional) Seed the Database

If you have seed data:
```bash
npx prisma db seed
```

## Alternative: If Using migrate dev

If you're in a development environment and want Prisma to track migrations:

```bash
npx prisma migrate dev
```

This will:
- Apply all pending migrations
- Generate Prisma Client
- Ask for confirmation if there are schema changes

## Troubleshooting

### If migration fails with "already exists" errors:
The migration is idempotent, but if you get errors, you can:
1. Check which migrations are already applied: `npx prisma migrate status`
2. Manually mark migrations as applied if needed: `npx prisma migrate resolve --applied <migration_name>`

### If you see drift errors:
Since you reset the database, there shouldn't be drift. If you do:
- Make sure all migration files are present
- Check that the schema.prisma matches your expectations
- Run `npx prisma migrate deploy` again

## Notes

- ✅ After reset, the database is clean - perfect time to apply all migrations
- ✅ `prisma migrate deploy` is the production-safe command
- ✅ All migrations will run in chronological order
- ✅ The drift resolution migration will run last and ensure everything is in sync

