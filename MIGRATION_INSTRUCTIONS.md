# Migration Instructions for Product Variations Feature

## Quick Fix (Development - Recommended)

Since you're on a feature branch and in development, use `prisma db push` to sync your schema directly:

```bash
cd backend
npx prisma db push
```

This will:
- ✅ Sync your schema to the database immediately
- ✅ Create the new `ProductAttribute` and `ProductAttributeValue` tables
- ✅ Update existing tables as needed
- ⚠️ **Won't create migration files** (fine for feature branch)

After this, regenerate Prisma Client:

```bash
npx prisma generate
```

Then restart your backend server.

---

## Alternative: Create Proper Migration (For Production)

If you want to create a proper migration file:

### Step 1: Create Migration File Only (Review First)

```bash
cd backend
npx prisma migrate dev --create-only --name add_product_variations
```

This creates the migration file but doesn't apply it. Review the SQL in:
`prisma/migrations/[timestamp]_add_product_variations/migration.sql`

### Step 2: Apply the Migration

```bash
npx prisma migrate dev
```

### Step 3: Regenerate Prisma Client

```bash
npx prisma generate
```

---

## If You Get "Drift Detected" Error

The drift error means your database schema doesn't match your migration history. You have two options:

### Option 1: Resolve Drift (Recommended for Production)

```bash
# This will create a migration to resolve the drift
npx prisma migrate dev --name resolve_drift_and_add_variations
```

### Option 2: Reset Database (Development Only - ⚠️ Deletes All Data)

```bash
npx prisma migrate reset
```

This will:
- Drop the database
- Recreate it
- Run all migrations from scratch
- Run seed scripts (if any)

---

## After Migration

1. **Regenerate Prisma Client:**
   ```bash
   npx prisma generate
   ```

2. **Restart Backend:**
   ```bash
   npm run start:dev
   ```

3. **Verify Tables Created:**
   You can check in your database or run:
   ```bash
   npx prisma studio
   ```
   This opens a GUI to view your database tables.

---

## What Gets Created

The migration will create:

1. **ProductAttribute** table:
   - Stores attribute definitions (Color, Size, Storage, etc.)
   - Tenant-scoped
   - Has values relationship

2. **ProductAttributeValue** table:
   - Stores values for each attribute (Black, 38, 256GB, etc.)
   - Linked to ProductAttribute
   - Supports color swatches and images

3. **Updates ProductVariation** table:
   - Adds `barcode` and `weight` fields (if not already there)
   - Updates indexes

---

## Troubleshooting

### Error: "Table already exists"
- The old ProductAttribute table might still exist
- Drop it manually or use `prisma migrate reset` (development only)

### Error: "Foreign key constraint"
- Make sure Tenant table exists
- Check that all required relations are in place

### Error: "Cannot find module '@prisma/client'"
- Run `npx prisma generate` after migration
- Restart your TypeScript server/IDE
















