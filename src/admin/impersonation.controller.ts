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
import {
  Request as ExpressRequest,
  Response,
  type CookieOptions,
} from 'express';
import { AuthGuard } from '@nestjs/passport';
import { SuperadminGuard } from './superadmin.guard';
import { TrialGuard } from '../auth/trial.guard';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';
import {
  IMPERSONATION_COOKIE_TENANT_ID,
  IMPERSONATION_COOKIE_TENANT_NAME,
} from './impersonation.interceptor';

const COOKIE_OPTS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
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

  private asObject(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : null;
  }

  private asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private getUserId(req: ExpressRequest): string {
    const user = this.asObject(
      (req as ExpressRequest & { user?: unknown }).user,
    );
    return this.asString(user?.userId) || this.asString(user?.sub);
  }

  private getCookie(req: ExpressRequest, name: string): string {
    const cookies = this.asObject(
      (req as ExpressRequest & { cookies?: unknown }).cookies,
    );
    return this.asString(cookies?.[name]);
  }

  @Post('start')
  async start(
    @Body() body: { tenantId: string },
    @Req() req: ExpressRequest,
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

    const userId = this.getUserId(req);
    await this.auditLog.log(userId || null, 'impersonation_started', {
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
  async end(
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = this.getUserId(req);
    const tenantId = this.getCookie(req, IMPERSONATION_COOKIE_TENANT_ID);

    if (tenantId) {
      await this.auditLog.log(userId || null, 'impersonation_ended', {
        tenantId,
      });
    }

    res.clearCookie(IMPERSONATION_COOKIE_TENANT_ID, { path: '/' });
    res.clearCookie(IMPERSONATION_COOKIE_TENANT_NAME, { path: '/' });

    return { success: true };
  }

  @Get('status')
  status(@Req() req: ExpressRequest) {
    const tenantId = this.getCookie(req, IMPERSONATION_COOKIE_TENANT_ID);
    const tenantName = this.getCookie(req, IMPERSONATION_COOKIE_TENANT_NAME);
    const user = this.asObject(
      (req as ExpressRequest & { user?: unknown }).user,
    );
    const isSuperadmin = user?.isSuperadmin === true;

    if (!tenantId || !isSuperadmin) {
      return { impersonating: false };
    }

    return {
      impersonating: true,
      tenantId,
      tenantName: tenantName || 'Unknown',
    };
  }
}
