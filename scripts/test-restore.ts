import {
  appendBackupLog,
  BACKUP_DIR,
  BACKUP_FILE_PREFIX,
  getRequiredEnv,
  loadEnvFromBackendRoot,
  parseDatabaseUrl,
  runCommand,
} from './backup-utils';
import { promises as fs } from 'fs';
import * as path from 'path';

function getTestRestoreDbName(): string {
  return process.env.BACKUP_TEST_DB_NAME || 'adeera_test_restore';
}

interface BackupFileInfo {
  fileName: string;
  fullPath: string;
  mtimeMs: number;
}

async function findLatestBackup(): Promise<BackupFileInfo> {
  await fs.mkdir(BACKUP_DIR, { recursive: true });

  const entries = await fs.readdir(BACKUP_DIR, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.startsWith(`${BACKUP_FILE_PREFIX}_`) && name.endsWith('.dump'));

  if (!files.length) {
    throw new Error('No backup files found in backups/. Run npm run backup first.');
  }

  const enriched: BackupFileInfo[] = [];
  for (const fileName of files) {
    const fullPath = path.join(BACKUP_DIR, fileName);
    const stat = await fs.stat(fullPath);
    enriched.push({ fileName, fullPath, mtimeMs: stat.mtimeMs });
  }

  enriched.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return enriched[0];
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function runPsqlSql(
  sql: string,
  dbConnection: ReturnType<typeof parseDatabaseUrl>,
  database: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
  const env = { ...process.env };
  if (dbConnection.password) {
    env.PGPASSWORD = dbConnection.password;
  }
  if (dbConnection.sslmode) {
    env.PGSSLMODE = dbConnection.sslmode;
  }

  const args = [
    '--host',
    dbConnection.host,
    '--port',
    dbConnection.port,
    '--username',
    dbConnection.username,
    '--dbname',
    database,
    '-v',
    'ON_ERROR_STOP=1',
    '-t',
    '-A',
    '-c',
    sql,
  ];

  return await runCommand('psql', args, { env });
}

async function recreateRestoreDatabase(dbConnection: ReturnType<typeof parseDatabaseUrl>): Promise<void> {
  const testRestoreDbName = getTestRestoreDbName();
  const adminDatabase = 'postgres';
  const quotedDbName = quoteIdentifier(testRestoreDbName);

  const terminateSql = [
    'SELECT pg_terminate_backend(pid)',
    'FROM pg_stat_activity',
    `WHERE datname = '${testRestoreDbName.replace(/'/g, "''")}'`,
    'AND pid <> pg_backend_pid();',
  ].join(' ');

  const dropSql = `DROP DATABASE IF EXISTS ${quotedDbName};`;
  const createSql = `CREATE DATABASE ${quotedDbName};`;

  const terminateResult = await runPsqlSql(terminateSql, dbConnection, adminDatabase);
  if (terminateResult.code !== 0) {
    throw new Error(`Failed to terminate restore DB connections: ${terminateResult.stderr || terminateResult.stdout}`);
  }

  const dropResult = await runPsqlSql(dropSql, dbConnection, adminDatabase);
  if (dropResult.code !== 0) {
    throw new Error(`Failed to drop restore DB: ${dropResult.stderr || dropResult.stdout}`);
  }

  const createResult = await runPsqlSql(createSql, dbConnection, adminDatabase);
  if (createResult.code !== 0) {
    throw new Error(`Failed to create restore DB: ${createResult.stderr || createResult.stdout}`);
  }
}

async function restoreBackup(backupPath: string, dbConnection: ReturnType<typeof parseDatabaseUrl>): Promise<void> {
  const testRestoreDbName = getTestRestoreDbName();
  const env = { ...process.env };
  if (dbConnection.password) {
    env.PGPASSWORD = dbConnection.password;
  }
  if (dbConnection.sslmode) {
    env.PGSSLMODE = dbConnection.sslmode;
  }

  const args = [
    '--host',
    dbConnection.host,
    '--port',
    dbConnection.port,
    '--username',
    dbConnection.username,
    '--dbname',
    testRestoreDbName,
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-privileges',
    backupPath,
  ];

  const restoreResult = await runCommand('pg_restore', args, { env });
  if (restoreResult.code !== 0) {
    throw new Error(`pg_restore failed: ${restoreResult.stderr || restoreResult.stdout}`);
  }
}

async function runSanityChecks(dbConnection: ReturnType<typeof parseDatabaseUrl>): Promise<void> {
  const testRestoreDbName = getTestRestoreDbName();
  const tableCountSql = [
    'SELECT COUNT(*)',
    'FROM information_schema.tables',
    "WHERE table_schema='public'",
    "AND table_type='BASE TABLE';",
  ].join(' ');

  const tableCountResult = await runPsqlSql(tableCountSql, dbConnection, testRestoreDbName);
  if (tableCountResult.code !== 0) {
    throw new Error(`Failed to inspect restored tables: ${tableCountResult.stderr || tableCountResult.stdout}`);
  }

  const tableCount = Number.parseInt(tableCountResult.stdout.trim(), 10);
  if (!Number.isFinite(tableCount) || tableCount <= 0) {
    throw new Error('Sanity check failed: restored DB has zero public tables.');
  }

  const migrationExistsSql = [
    'SELECT COUNT(*)',
    'FROM information_schema.tables',
    "WHERE table_schema='public'",
    "AND table_name='_prisma_migrations';",
  ].join(' ');

  const migrationExistsResult = await runPsqlSql(migrationExistsSql, dbConnection, testRestoreDbName);
  if (migrationExistsResult.code !== 0) {
    throw new Error(`Failed to inspect _prisma_migrations table: ${migrationExistsResult.stderr || migrationExistsResult.stdout}`);
  }

  const migrationExists = Number.parseInt(migrationExistsResult.stdout.trim(), 10);
  if (!Number.isFinite(migrationExists) || migrationExists <= 0) {
    throw new Error('Sanity check failed: _prisma_migrations table was not restored.');
  }

  const migrationRowsSql = 'SELECT COUNT(*) FROM "_prisma_migrations";';
  const migrationRowsResult = await runPsqlSql(migrationRowsSql, dbConnection, testRestoreDbName);
  if (migrationRowsResult.code !== 0) {
    throw new Error(`Failed to count _prisma_migrations rows: ${migrationRowsResult.stderr || migrationRowsResult.stdout}`);
  }

  const migrationRows = Number.parseInt(migrationRowsResult.stdout.trim(), 10);
  if (!Number.isFinite(migrationRows) || migrationRows <= 0) {
    throw new Error('Sanity check failed: _prisma_migrations row count is zero.');
  }

  console.log(`Sanity checks passed: publicTables=${tableCount}, prismaMigrationsRows=${migrationRows}`);
}

async function testRestore(): Promise<void> {
  await loadEnvFromBackendRoot();

  const databaseUrl = getRequiredEnv('DATABASE_URL');
  const dbConnection = parseDatabaseUrl(databaseUrl);
  const testRestoreDbName = getTestRestoreDbName();
  const latest = await findLatestBackup();

  console.log(`Testing restore from latest backup: ${latest.fileName}`);

  await recreateRestoreDatabase(dbConnection);
  await restoreBackup(latest.fullPath, dbConnection);
  await runSanityChecks(dbConnection);

  const summary = `Restore verification passed for ${latest.fileName} into database ${testRestoreDbName}.`;
  await appendBackupLog({
    outcome: 'SUCCESS',
    fileName: latest.fileName,
    message: summary,
  });

  console.log(summary);
}

testRestore()
  .then(() => {
    process.exitCode = 0;
  })
  .catch(async (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);

    try {
      await appendBackupLog({
        outcome: 'FAILURE',
        message: `Restore verification failed: ${message}`,
      });
    } catch {
      // Ignore secondary logging failures.
    }

    console.error(`Restore verification failed: ${message}`);
    process.exitCode = 1;
  });
