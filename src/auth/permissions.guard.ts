import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserService } from '../user/user.service';
import { PERMISSIONS_KEY } from './decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector, 
    private readonly userService: UserService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // DEBUG LOGGING
    console.log('[PermissionsGuard] user:', JSON.stringify(user));

    // Owner/admin bypass
    const roles = Array.isArray(user.roles)
      ? user.roles.map(r => typeof r === 'string' ? r : r.name)
      : [];
    if (roles.includes('owner') || roles.includes('admin')) {
      console.log('[PermissionsGuard] Owner/admin bypass');
      return true;
    }

    // Check required permissions
    const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler());
    if (!requiredPermissions) return true;

    const hasAll = requiredPermissions.every(permission =>
      user.permissions && user.permissions.includes(permission)
    );
    if (!hasAll) {
      console.warn('[PermissionsGuard] Missing permissions:', requiredPermissions, 'User has:', user.permissions);
    }
    return hasAll;
  }
}