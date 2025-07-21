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
      console.log('Owner/admin bypass: all permissions granted');
      return true;
    }
    const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler());
    console.log('PermissionsGuard user:', user, 'requiredPermissions:', requiredPermissions);
    if (!user) throw new ForbiddenException('User not authenticated');
    const tenantId = user?.tenantId;
    const userId = user?.userId || user?.sub;
    let userPermissions: string[] = [];

    if (tenantId) {
      // Normal case: tenant-specific permissions
      userPermissions = await this.userService.getEffectivePermissions(userId, tenantId);
    } else {
      // Global endpoints: check direct user permissions (not via roles)
      const direct = await this.userService.getUserPermissions(userId);
      userPermissions = direct.map((p: any) => p.permission.key);
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