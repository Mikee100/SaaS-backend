import {
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AUTH_COOKIE_NAMES } from './constants';
import { PrismaService } from '../prisma.service';

type JwtPayload = {
  sub: string;
  email?: string;
  tenantId?: string | null;
  branchId?: string | null;
  isSuperadmin?: boolean;
  [key: string]: unknown;
};

/** Extract JWT from cookie (enterprise auth) or Authorization Bearer (legacy / Electron). */
function jwtFromCookieOrBearer(req: Request): string | null {
  const cookies = (req as { cookies?: unknown }).cookies;
  const cookieToken =
    cookies && typeof cookies === 'object'
      ? (cookies as Record<string, unknown>)[AUTH_COOKIE_NAMES.ACCESS_TOKEN]
      : undefined;
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return cookieToken;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const bearerToken = authHeader.slice('Bearer '.length).trim();
  return bearerToken.length > 0 ? bearerToken : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: jwtFromCookieOrBearer,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'waweru',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        tenantId: true,
        isDisabled: true,
        isSuperadmin: true,
        adminRoles: true,
      },
    });

    if (!dbUser) {
      throw new UnauthorizedException('Invalid session user');
    }

    if (dbUser.isDisabled) {
      throw new UnauthorizedException('Account disabled. Contact admin.');
    }

    if (!dbUser.isSuperadmin && dbUser.tenantId) {
      const restricted = await this.isTenantRestricted(dbUser.tenantId);
      if (restricted && !this.isAllowedRestrictedRoute(req)) {
        throw new ForbiddenException(
          'Subscription has expired. Access is restricted until renewal. You can still access billing.',
        );
      }
    }

    const user = {
      userId: payload.sub,
      email: payload.email,
      tenantId:
        typeof payload.tenantId === 'string'
          ? payload.tenantId
          : (dbUser.tenantId ?? null),
      branchId: typeof payload.branchId === 'string' ? payload.branchId : null,
      isSuperadmin:
        typeof payload.isSuperadmin === 'boolean'
          ? payload.isSuperadmin
          : Boolean(dbUser.isSuperadmin),
      adminRoles: Array.isArray(payload.adminRoles)
        ? payload.adminRoles
        : (dbUser.adminRoles ?? []),
      ...payload,
    };
    return user;
  }

  private isAllowedRestrictedRoute(req: Request): boolean {
    const path = (req.path || req.originalUrl || '').split('?')[0];
    const allowedPrefixes = ['/billing', '/subscription', '/auth'];
    const allowedExact = ['/user/me'];

    return (
      allowedPrefixes.some((prefix) => path.startsWith(prefix)) ||
      allowedExact.includes(path)
    );
  }

  private async isTenantRestricted(tenantId: string): Promise<boolean> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        isSuspended: true,
        Subscription: {
          orderBy: {
            currentPeriodStart: 'desc',
          },
          take: 1,
          select: {
            id: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
          },
        },
      },
    });

    if (!tenant) {
      return true;
    }

    if (tenant.isSuspended) {
      return true;
    }

    const subscription = tenant.Subscription?.[0];
    if (!subscription) {
      return true;
    }

    const now = new Date();
    if (subscription.currentPeriodEnd > now) {
      return false;
    }

    const extensionDays = await this.getExtraGraceDays(
      tenantId,
      subscription.currentPeriodStart,
      subscription.id,
    );
    const totalGraceDays = 3 + extensionDays;
    const graceEndsAt = new Date(subscription.currentPeriodEnd);
    graceEndsAt.setDate(graceEndsAt.getDate() + totalGraceDays);

    return now > graceEndsAt;
  }

  private async getExtraGraceDays(
    tenantId: string,
    periodStart: Date,
    subscriptionId: string,
  ): Promise<number> {
    const extensions = await this.prisma.notification.findMany({
      where: {
        tenantId,
        type: 'subscription_grace_extension',
        createdAt: {
          gte: periodStart,
        },
      },
      select: {
        data: true,
      },
    });

    return extensions.reduce((sum, extension) => {
      const data = extension.data as {
        days?: number;
        subscriptionId?: string;
      } | null;
      if (!data) {
        return sum;
      }
      if (data.subscriptionId && data.subscriptionId !== subscriptionId) {
        return sum;
      }
      const days = Number(data.days || 0);
      if (!Number.isFinite(days) || days <= 0) {
        return sum;
      }
      return sum + Math.floor(days);
    }, 0);
  }
}
