import { ApiProperty } from '@nestjs/swagger';

export class BackupStatusDto {
  @ApiProperty({ description: 'Current backup status' })
  status: 'idle' | 'running' | 'success' | 'failed';

  @ApiProperty({ description: 'Last backup timestamp' })
  lastBackupAt?: Date;

  @ApiProperty({ description: 'Last backup duration in milliseconds' })
  lastBackupDuration?: number;

  @ApiProperty({ description: 'Last backup file size in bytes' })
  lastBackupSize?: number;

  @ApiProperty({ description: 'Last backup error message' })
  lastError?: string;

  @ApiProperty({ description: 'Next scheduled backup timestamp' })
  nextBackupAt?: Date;

  @ApiProperty({ description: 'Total number of backups stored' })
  totalBackups: number;

  @ApiProperty({ description: 'Disk space used by backups in bytes' })
  diskSpaceUsed: number;
}

export class BackupInfoDto {
  @ApiProperty({ description: 'Backup filename' })
  filename: string;

  @ApiProperty({ description: 'Backup creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Backup file size in bytes' })
  size: number;

  @ApiProperty({ description: 'Backup status' })
  status: 'success' | 'failed';

  @ApiProperty({ description: 'Backup duration in milliseconds' })
  duration?: number;
}

export class BackupListDto {
  @ApiProperty({ type: [BackupInfoDto] })
  backups: BackupInfoDto[];

  @ApiProperty({ description: 'Total number of backups' })
  total: number;
}
