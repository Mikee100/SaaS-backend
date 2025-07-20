import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.permissions) {
      throw new ForbiddenException('No permissions found');
    }
    const userPerms = user.permissions.map((p: any) => p.key);
    const hasAll = requiredPermissions.every(perm => userPerms.includes(perm));
    if (!hasAll) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
} 