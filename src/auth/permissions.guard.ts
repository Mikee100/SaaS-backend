import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserService } from '../user/user.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    // Owner/admin bypass: always allow
    if (user?.roles?.includes('owner') || user?.roles?.includes('admin')) {
      return true;
    }
    const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler());
    if (!user) throw new ForbiddenException('User not authenticated');
    if (!Array.isArray(requiredPermissions) || requiredPermissions.length === 0) {
      throw new ForbiddenException('No permissions specified for this action');
    }
    const tenantId = user?.tenantId;
    const userId = user?.userId || user?.sub;
    let userPermissions: string[] = [];

    if (tenantId) {
      // Normal case: tenant-specific permissions
      const permissions = await this.userService.getEffectivePermissions(userId, tenantId);
      userPermissions = permissions.map(p => p.name);
    } else {
      // Global endpoints: check direct user permissions (not via roles)
      const direct = await this.userService.getUserPermissions(userId);
      userPermissions = direct.map((p: any) => p.permission?.key || p.permission?.name || '');
      // Allow all permissions for owners/admins
      if (user?.roles?.includes('owner') || user?.roles?.includes('admin')) {
        return true;
      }
    }

    const hasPermission = requiredPermissions.some((perm) => userPermissions.includes(perm));
    if (!hasPermission) throw new ForbiddenException('Not allowed');
    return true;
  }
} 