import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from './auth/permissions.decorator';
import { PermissionsGuard } from './auth/permissions.guard';
import { TrialGuard } from './auth/trial.guard';

@UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Permissions('view_audit_log')
  async getLogs(@Query('limit') limit: string) {
    return this.auditLogService.getLogs(Number(limit) || 100);
  }

  @Post('terminal-enrollment-reset')
  @Permissions('edit_settings')
  async logTerminalEnrollmentReset(
    @Req() req: any,
    @Body()
    body: {
      approvedByUserId?: string;
      previousTenantId?: string;
      previousBranchId?: string;
      previousTenantName?: string;
      previousBranchName?: string;
      reason?: string;
      triggeredAt?: string;
    },
  ) {
    const actorUserId = req?.user?.userId || req?.user?.sub || null;
    const ip = req?.ip;

    await this.auditLogService.log(
      actorUserId,
      'terminal_enrollment_reset',
      {
        approvedByUserId: body?.approvedByUserId || null,
        previousTenantId: body?.previousTenantId || null,
        previousBranchId: body?.previousBranchId || null,
        previousTenantName: body?.previousTenantName || null,
        previousBranchName: body?.previousBranchName || null,
        reason: body?.reason || 'manual_terminal_reenrollment',
        triggeredAt: body?.triggeredAt || new Date().toISOString(),
      },
      ip,
    );

    return { success: true };
  }
}
