import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BackupService } from './backup.service';
import { BackupStatusDto, BackupListDto } from './dto/backup-status.dto';
import { CreateBackupDto } from './dto/create-backup.dto';

@ApiTags('Backup')
@Controller('backup')

export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('trigger')
  @ApiOperation({ summary: 'Trigger manual backup' })
  @ApiResponse({
    status: 201,
    description: 'Backup triggered successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Backup already in progress',
  })
  async triggerBackup(@Body() createBackupDto: CreateBackupDto) {
    try {
      const result = await this.backupService.createBackup(createBackupDto.name);
      return {
        success: true,
        message: 'Backup triggered successfully',
        data: result,
      };
    } catch (error) {
      if (error.message.includes('already in progress')) {
        throw new HttpException(error.message, HttpStatus.CONFLICT);
      }
      throw new HttpException(
        `Failed to trigger backup: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Get backup status and information' })
  @ApiResponse({
    status: 200,
    description: 'Backup status retrieved successfully',
    type: BackupStatusDto,
  })
  async getBackupStatus(): Promise<BackupStatusDto> {
    return await this.backupService.getBackupStatus();
  }

  @Get('list')
  @ApiOperation({ summary: 'List all available backups' })
  @ApiResponse({
    status: 200,
    description: 'Backup list retrieved successfully',
    type: BackupListDto,
  })
  async listBackups(): Promise<BackupListDto> {
    return await this.backupService.listBackups();
  }

  @Post('restore/:filename')
  @ApiOperation({ summary: 'Restore from backup (not yet implemented)' })
  @ApiResponse({
    status: 501,
    description: 'Restore functionality not yet implemented',
  })
  async restoreBackup(@Param('filename') filename: string) {
    try {
      await this.backupService.restoreBackup(filename);
      return {
        success: true,
        message: 'Backup restored successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to restore backup: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('download/:filename')
  @ApiOperation({ summary: 'Download backup file' })
  @ApiResponse({
    status: 200,
    description: 'Backup file download initiated',
  })
  @ApiResponse({
    status: 404,
    description: 'Backup file not found',
  })
  async downloadBackup(@Param('filename') filename: string) {
    try {
      const filePath = await this.backupService.getBackupPath(filename);
      // In a real implementation, you would return a stream or use a file serving mechanism
      // For now, just return the path info
      return {
        success: true,
        message: 'Backup file found',
        data: {
          filename,
          path: filePath,
          note: 'Direct download not implemented yet. File path provided for manual access.',
        },
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }
}
