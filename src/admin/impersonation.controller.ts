import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { SuperadminGuard } from './superadmin.guard';
import { TrialGuard } from '../auth/trial.guard';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';
import {
  IMPERSONATION_COOKIE_TENANT_ID,
  IMPERSONATION_COOKIE_TENANT_NAME,
} from './impersonation.interceptor';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  path: '/',
  maxAge: 8 * 60 * 60 * 1000, // 8 hours
};

@Controller('admin/impersonate')
@UseGuards(AuthGuard('jwt'), SuperadminGuard, TrialGuard)
export class ImpersonationController {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  @Post('start')
  async start(
    @Body() body: { tenantId: string },
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tenantId = body?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    const userId = req.user?.userId || req.user?.sub;
    await this.auditLog.log(userId, 'impersonation_started', {
      tenantId: tenant.id,
      tenantName: tenant.name,
    });

    res.cookie(IMPERSONATION_COOKIE_TENANT_ID, tenant.id, COOKIE_OPTS);
    res.cookie(IMPERSONATION_COOKIE_TENANT_NAME, tenant.name, COOKIE_OPTS);

    return {
      success: true,
      tenantId: tenant.id,
      tenantName: tenant.name,
    };
  }

  @Post('end')
  async end(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const userId = req.user?.userId || req.user?.sub;
    const tenantId = req.cookies?.[IMPERSONATION_COOKIE_TENANT_ID];

    if (tenantId) {
      await this.auditLog.log(userId, 'impersonation_ended', { tenantId });
    }

    res.clearCookie(IMPERSONATION_COOKIE_TENANT_ID, { path: '/' });
    res.clearCookie(IMPERSONATION_COOKIE_TENANT_NAME, { path: '/' });

    return { success: true };
  }

  @Get('status')
  async status(@Req() req: any) {
    const tenantId = req.cookies?.[IMPERSONATION_COOKIE_TENANT_ID];
    const tenantName = req.cookies?.[IMPERSONATION_COOKIE_TENANT_NAME];

    if (!tenantId || !req.user?.isSuperadmin) {
      return { impersonating: false };
    }

    return {
      impersonating: true,
      tenantId,
      tenantName: tenantName || 'Unknown',
    };
  }
}
