import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { basename } from 'path';
import { BackupService } from './backup.service';
import { BackupStatusDto, BackupListDto } from './dto/backup-status.dto';
import { CreateBackupDto } from './dto/create-backup.dto';
import { SuperadminGuard } from '../admin/superadmin.guard';
import { TrialGuard } from '../auth/trial.guard';

@ApiTags('Backup')
@Controller('backup')
@UseGuards(AuthGuard('jwt'), SuperadminGuard, TrialGuard)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }

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
      const result = await this.backupService.createBackup(
        createBackupDto.name,
      );
      return {
        success: true,
        message: 'Backup triggered successfully',
        data: result,
      };
    } catch (error) {
      const message = this.getErrorMessage(error);
      if (message.includes('already in progress')) {
        throw new HttpException(message, HttpStatus.CONFLICT);
      }
      throw new HttpException(
        `Failed to trigger backup: ${message}`,
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
  @ApiOperation({ summary: 'Restore database from a backup file' })
  @ApiResponse({
    status: 201,
    description: 'Backup restored successfully',
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
        `Failed to restore backup: ${this.getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('download/:filename')
  @ApiOperation({ summary: 'Download backup file' })
  @ApiResponse({
    status: 200,
    description: 'Backup file stream',
  })
  @ApiResponse({
    status: 404,
    description: 'Backup file not found',
  })
  async downloadBackup(
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const filePath = await this.backupService.getBackupPath(filename);
      const safeName = basename(filePath);
      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${safeName}"`,
      });
      const stream = createReadStream(filePath);
      stream.on('error', () => {
        if (!res.headersSent) {
          res.status(HttpStatus.INTERNAL_SERVER_ERROR).end();
        } else {
          res.end();
        }
      });
      stream.pipe(res);
    } catch (error) {
      throw new HttpException(
        this.getErrorMessage(error),
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
