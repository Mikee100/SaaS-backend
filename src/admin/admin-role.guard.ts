import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { ADMIN_ROLES_KEY } from './admin-roles.decorator';

const guardLogger = new Logger('AdminRoleCheck');

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Shared authorization check for platform-staff access: superadmins bypass
 * everything, otherwise the caller must hold one of the required AdminRoles.
 * Trusts the JWT-embedded `adminRoles`/`isSuperadmin` claims first, falling
 * back to a DB read for tokens issued before a role was granted/revoked, or
 * predating this claim entirely. Kept as a plain function (not a Nest
 * provider) so both AdminRoleGuard and SuperadminGuard can depend on nothing
 * but the globally-available PrismaService and stay usable from any module
 * without extra wiring.
 */
export async function hasRequiredAdminRole(
  prisma: PrismaService,
  user: Record<string, unknown> | undefined,
  required: AdminRole[],
): Promise<boolean> {
  if (!user) {
    return false;
  }

  if (user.isSuperadmin === true) {
    return true;
  }

  const jwtRoles = Array.isArray(user.adminRoles)
    ? (user.adminRoles as string[])
    : [];
  if (required.some((role) => jwtRoles.includes(role))) {
    return true;
  }

  const userId =
    asString(user.userId) || asString(user.sub) || asString(user.id);
  if (!userId) {
    return false;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperadmin: true, adminRoles: true },
  });
  if (!dbUser) {
    return false;
  }
  if (dbUser.isSuperadmin) {
    return true;
  }

  const allowed = required.some((role) =>
    (dbUser.adminRoles ?? []).includes(role),
  );
  guardLogger.debug(
    `user=${userId} required=[${required.join(',')}] allowed=${allowed}`,
  );
  return allowed;
}

@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<AdminRole[]>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: Record<string, unknown>;
    }>();
    return hasRequiredAdminRole(this.prisma, request.user, required);
  }
}
