import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { Roles } from './auth/roles.decorator';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Roles('owner', 'manager')
  async getLogs(@Query('limit') limit: string) {
    return this.auditLogService.getLogs(Number(limit) || 100);
  }
} 