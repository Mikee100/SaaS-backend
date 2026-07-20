import { promises as fs } from 'fs';
import * as path from 'path';
import {
  appendBackupLog,
  BACKUP_DIR,
  buildTimestampFileName,
  ensureBackupDirectory,
  formatBytes,
  getRequiredEnv,
  loadEnvFromBackendRoot,
  runCommand,
} from './backup-utils';

async function runBackup(): Promise<void> {
  await loadEnvFromBackendRoot();
  await ensureBackupDirectory();

  const databaseUrl = getRequiredEnv('DATABASE_URL');
  const fileName = buildTimestampFileName();
  const backupPath = path.join(BACKUP_DIR, fileName);

  console.log(`Starting backup to ${backupPath}`);

  const args = ['-Fc', '--no-owner', '--no-privileges', '-f', backupPath, databaseUrl];

  const result = await runCommand('pg_dump', args, {
    env: { ...process.env },
  });

  if (result.code !== 0) {
    const errorMessage = result.stderr || result.stdout || 'pg_dump returned a non-zero exit code.';
    throw new Error(`Backup file ${fileName} failed. pg_dump output: ${errorMessage}`);
  }

  const stat = await fs.stat(backupPath);
  await appendBackupLog({
    outcome: 'SUCCESS',
    fileName,
    sizeBytes: stat.size,
    message: 'Backup created successfully.',
  });

  console.log(`Backup complete: ${fileName} (${formatBytes(stat.size)})`);
}

runBackup()
  .then(() => {
    process.exitCode = 0;
  })
  .catch(async (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    const fileNameMatch = message.match(/adeera_backup_\d{4}-\d{2}-\d{2}_\d{4}\.dump/);

    // Capture unexpected failures (for example, pg_dump not found) in the backup log.
    try {
      await appendBackupLog({
        outcome: 'FAILURE',
        fileName: fileNameMatch ? fileNameMatch[0] : undefined,
        message,
      });
    } catch {
      // Intentionally swallow secondary log-write failures so we still show original error.
    }

    console.error(`Backup failed: ${message}`);
    process.exitCode = 1;
  });
