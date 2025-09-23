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

<<<<<<< HEAD
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    // Owner/admin bypass: always allow
    if (user?.roles?.includes('owner') || user?.roles?.includes('admin')) {
=======
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
>>>>>>> a9ab4d8c5762126916fa97fc22de1f53d95703c1
      return true;
    }

    // Check required permissions
    const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler());
<<<<<<< HEAD
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
      // In permissions.guard.ts
// In permissions.guard.ts, update the line to:
const direct = await this.userService.getEffectivePermissions(userId);
      userPermissions = direct.map((p: any) => p.permission?.key || p.permission?.name || '');
      // Allow all permissions for owners/admins
      if (user?.roles?.includes('owner') || user?.roles?.includes('admin')) {
        return true;
      }
=======
    if (!requiredPermissions) return true;

    const hasAll = requiredPermissions.every(permission =>
      user.permissions && user.permissions.includes(permission)
    );
    if (!hasAll) {
      console.warn('[PermissionsGuard] Missing permissions:', requiredPermissions, 'User has:', user.permissions);
>>>>>>> a9ab4d8c5762126916fa97fc22de1f53d95703c1
    }
    return hasAll;
  }
}