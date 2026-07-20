import { promises as fs } from 'fs';
import * as path from 'path';
import {
  appendBackupLog,
  BACKUP_DIR,
  BACKUP_FILE_PREFIX,
  formatBytes,
  loadEnvFromBackendRoot,
} from './backup-utils';

const DEFAULT_RETENTION_DAYS = 7;

function getRetentionDays(): number {
  const raw = process.env.BACKUP_RETENTION_DAYS;
  if (!raw) {
    return DEFAULT_RETENTION_DAYS;
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('BACKUP_RETENTION_DAYS must be a non-negative integer.');
  }

  return value;
}

async function cleanupOldBackups(): Promise<void> {
  await loadEnvFromBackendRoot();

  const retentionDays = getRetentionDays();
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - retentionMs;

  await fs.mkdir(BACKUP_DIR, { recursive: true });

  const entries = await fs.readdir(BACKUP_DIR, { withFileTypes: true });
  const backupFiles = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.startsWith(`${BACKUP_FILE_PREFIX}_`) && name.endsWith('.dump'));

  let deletedCount = 0;
  let reclaimedBytes = 0;

  for (const fileName of backupFiles) {
    const fullPath = path.join(BACKUP_DIR, fileName);
    const stat = await fs.stat(fullPath);

    if (stat.mtimeMs < cutoff) {
      await fs.unlink(fullPath);
      deletedCount += 1;
      reclaimedBytes += stat.size;
    }
  }

  const message = `Cleanup finished. deleted=${deletedCount}, reclaimed=${formatBytes(reclaimedBytes)}, retentionDays=${retentionDays}`;
  await appendBackupLog({
    outcome: 'SUCCESS',
    message,
  });

  console.log(message);
}

cleanupOldBackups()
  .then(() => {
    process.exitCode = 0;
  })
  .catch(async (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);

    try {
      await appendBackupLog({
        outcome: 'FAILURE',
        message: `Cleanup failed: ${message}`,
      });
    } catch {
      // Ignore secondary logging failures.
    }

    console.error(`Cleanup failed: ${message}`);
    process.exitCode = 1;
  });
