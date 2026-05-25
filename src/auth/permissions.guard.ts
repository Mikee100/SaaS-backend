import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserService } from '../user/user.service';
import { PERMISSIONS_KEY } from './decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly permissionAliases: Record<string, string[]> = {
    // Backward compatibility for tenants still using sales-centric permission names.
    view_reports: ['view_sales'],
    view_branches: ['view_sales'],
  };

  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as {
      isSuperadmin?: boolean;
      roles?: Array<string | { name?: string }>;
      permissions?: string[];
      userId?: string;
      sub?: string;
      tenantId?: string;
    };

    // Superadmin bypass - they have all permissions
    if (user.isSuperadmin === true) {
      return true;
    }

    // Owner/admin bypass
    const roles = Array.isArray(user.roles)
      ? user.roles
          .map((r) => (typeof r === 'string' ? r : r?.name || ''))
          .map((r) => r.toLowerCase())
      : [];
    if (roles.includes('owner') || roles.includes('admin')) {
      return true;
    }

    // Check required permissions
    const requiredPermissions = this.reflector.get<string[]>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );
    if (!requiredPermissions) return true;

    const userPermissions = new Set(
      Array.isArray(user.permissions)
        ? user.permissions.filter((perm): perm is string => typeof perm === 'string')
        : [],
    );

    // If JWT claims are stale/incomplete, load effective permissions from DB.
    const userId = user.userId || user.sub;
    if (userId && userPermissions.size === 0) {
      const effectivePermissions = await this.userService.getEffectivePermissions(
        userId,
        user.tenantId,
      );
      for (const perm of effectivePermissions) {
        if (perm?.name) {
          userPermissions.add(perm.name);
        }
      }
    }

    const hasPermissionOrAlias = (permission: string): boolean => {
      if (userPermissions.has(permission)) {
        return true;
      }

      const aliases = this.permissionAliases[permission] || [];
      return aliases.some((alias) => userPermissions.has(alias));
    };

    const hasAll = requiredPermissions.every((permission) =>
      hasPermissionOrAlias(permission),
    );

    if (!hasAll) {
      console.warn(
        '[PermissionsGuard] Missing permissions:',
        requiredPermissions,
        'User has:',
        Array.from(userPermissions.values()),
      );
    }
    return hasAll;
  }
}
