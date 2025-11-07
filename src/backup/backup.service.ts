import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { BackupStatusDto, BackupInfoDto } from './dto/backup-status.dto';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir = path.join(process.cwd(), 'backups');
  private readonly maxBackups = 24; // Keep last 24 hourly backups
  private currentBackupStatus: 'idle' | 'running' | 'success' | 'failed' = 'idle';
  private lastBackupAt?: Date;
  private lastBackupDuration?: number;
  private lastBackupSize?: number;
  private lastError?: string;
  private nextBackupAt?: Date;

  constructor() {
    this.initializeBackupDirectory();
    this.scheduleNextBackup();
  }

  private async initializeBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      this.logger.log(`Backup directory initialized: ${this.backupDir}`);
    } catch (error) {
      this.logger.error(`Failed to create backup directory: ${error.message}`);
    }
  }

  private scheduleNextBackup(): void {
    // Calculate next hour boundary
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    this.nextBackupAt = nextHour;
  }

  @Cron('0 * * * *') // Every hour at minute 0
  async handleScheduledBackup(): Promise<void> {
    this.logger.log('Starting scheduled hourly backup');
    try {
      await this.createBackup();
      this.logger.log('Scheduled backup completed successfully');
    } catch (error) {
      this.logger.error(`Scheduled backup failed: ${error.message}`);
    }
  }

  async createBackup(name?: string): Promise<BackupInfoDto> {
    if (this.currentBackupStatus === 'running') {
      throw new Error('Backup already in progress');
    }

    const startTime = Date.now();
    this.currentBackupStatus = 'running';

    try {
      // Generate backup filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = name || `backup-${timestamp}`;
      const backupFileName = `${backupName}.sql.gz`;
      const backupPath = path.join(this.backupDir, backupFileName);

      // Get database connection details from environment
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL environment variable not set');
      }

      // Parse database URL for pg_dump parameters
      const dbUrlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
      if (!dbUrlMatch) {
        throw new Error('Invalid DATABASE_URL format');
      }

      const [, user, password, host, port, database] = dbUrlMatch;

      // Create pg_dump command with gzip compression
      const pgDumpCommand = `pg_dump --host=${host} --port=${port} --username=${user} --dbname=${database} --no-password --format=custom --compress=9 --file="${backupPath}"`;

      // Set PGPASSWORD environment variable for authentication
      const env = { ...process.env, PGPASSWORD: password };

      this.logger.log(`Executing backup command: pg_dump to ${backupPath}`);

      // Execute pg_dump
      await execAsync(pgDumpCommand, { env });

      // Get file stats
      const stats = await fs.stat(backupPath);
      const duration = Date.now() - startTime;

      // Update status
      this.currentBackupStatus = 'success';
      this.lastBackupAt = new Date();
      this.lastBackupDuration = duration;
      this.lastBackupSize = stats.size;
      this.lastError = undefined;

      // Clean up old backups
      await this.cleanupOldBackups();

      // Schedule next backup
      this.scheduleNextBackup();

      const backupInfo: BackupInfoDto = {
        filename: backupFileName,
        createdAt: this.lastBackupAt,
        size: stats.size,
        status: 'success',
        duration: duration,
      };

      this.logger.log(`Backup completed successfully: ${backupFileName} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

      return backupInfo;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.currentBackupStatus = 'failed';
      this.lastError = error.message;
      this.lastBackupDuration = duration;

      this.logger.error(`Backup failed: ${error.message}`);

      throw error;
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(file => file.endsWith('.sql.gz'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          return {
            name: file,
            path: filePath,
            stats: fs.stat(filePath),
          };
        });

      // Wait for all stat operations
      const backupStats = await Promise.all(
        backupFiles.map(async (file) => ({
          ...file,
          stats: await file.stats,
        }))
      );

      // Sort by creation time (newest first)
      backupStats.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      // Remove old backups beyond the limit
      if (backupStats.length > this.maxBackups) {
        const filesToDelete = backupStats.slice(this.maxBackups);

        for (const file of filesToDelete) {
          await fs.unlink(file.path);
          this.logger.log(`Deleted old backup: ${file.name}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup old backups: ${error.message}`);
    }
  }

  async getBackupStatus(): Promise<BackupStatusDto> {
    const backups = await this.listBackups();
    const diskSpaceUsed = backups.backups.reduce((total, backup) => total + backup.size, 0);

    return {
      status: this.currentBackupStatus,
      lastBackupAt: this.lastBackupAt,
      lastBackupDuration: this.lastBackupDuration,
      lastBackupSize: this.lastBackupSize,
      lastError: this.lastError,
      nextBackupAt: this.nextBackupAt,
      totalBackups: backups.total,
      diskSpaceUsed,
    };
  }

  async listBackups(): Promise<{ backups: BackupInfoDto[]; total: number }> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => file.endsWith('.sql.gz'));

      const backups: BackupInfoDto[] = [];

      for (const file of backupFiles) {
        try {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);

          // Try to parse timestamp from filename
          let createdAt = stats.mtime;
          const timestampMatch = file.match(/backup-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
          if (timestampMatch) {
            const timestamp = timestampMatch[1].replace(/-/g, ':').replace('T', ' ');
            createdAt = new Date(timestamp + ':00.000Z');
          }

          backups.push({
            filename: file,
            createdAt,
            size: stats.size,
            status: 'success', // Assume success if file exists
          });
        } catch (error) {
          this.logger.warn(`Failed to process backup file ${file}: ${error.message}`);
        }
      }

      // Sort by creation time (newest first)
      backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return {
        backups,
        total: backups.length,
      };
    } catch (error) {
      this.logger.error(`Failed to list backups: ${error.message}`);
      return { backups: [], total: 0 };
    }
  }

  async restoreBackup(filename: string): Promise<void> {
    // This would implement restore functionality
    // For now, just log that it's not implemented
    this.logger.warn(`Restore functionality not yet implemented for ${filename}`);
    throw new Error('Restore functionality not yet implemented');
  }

  async getBackupPath(filename: string): Promise<string> {
    const fullPath = path.join(this.backupDir, filename);

    // Security check - ensure the file is within the backup directory
    const resolvedPath = path.resolve(fullPath);
    const resolvedBackupDir = path.resolve(this.backupDir);

    if (!resolvedPath.startsWith(resolvedBackupDir)) {
      throw new Error('Invalid backup filename');
    }

    // Check if file exists
    try {
      await fs.access(resolvedPath);
      return resolvedPath;
    } catch {
      throw new Error('Backup file not found');
    }
  }
}
