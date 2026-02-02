/**
 * One-time fix: sync _prisma_migrations so Prisma accepts the current state.
 * Run from backend folder: node prisma/fix-migration-history.js
 * Then run: npx prisma migrate dev --name add_enterprise_auth
 */
require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const migrationDir = path.join(__dirname, 'migrations', '20251030000000_resolve_drift');
const migrationFile = path.join(migrationDir, 'migration.sql');

if (!fs.existsSync(migrationFile)) {
  console.error('Migration file not found:', migrationFile);
  process.exit(1);
}

const content = fs.readFileSync(migrationFile, 'utf8');
const checksum = crypto.createHash('sha256').update(content).digest('hex');

async function main() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const result = await prisma.$executeRawUnsafe(
      `UPDATE "_prisma_migrations" SET migration_name = $1, checksum = $2 WHERE migration_name = $3`,
      '20251030000000_resolve_drift',
      checksum,
      '20250108120000_resolve_drift'
    );
    console.log('Updated _prisma_migrations:', result, 'row(s).');
    console.log('Now run: npx prisma migrate dev --name add_enterprise_auth');
  } catch (e) {
    console.error('Error:', e.message);
    console.log('\nRun this SQL manually instead:\n');
    console.log(`UPDATE "_prisma_migrations" SET migration_name = '20251030000000_resolve_drift', checksum = '${checksum}' WHERE migration_name = '20250108120000_resolve_drift';`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
