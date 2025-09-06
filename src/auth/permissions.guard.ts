import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserService } from '../user/user.service';
import { AuthGuard } from '@nestjs/passport';
import { PERMISSIONS_KEY } from './decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(
    private readonly reflector: Reflector, 
    private readonly userService: UserService
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
    if (isPublic) {
      console.log('[PermissionsGuard] isPublic route');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    console.log('[PermissionsGuard] user:', user);

    if (!user) {
      console.log('[PermissionsGuard] No user found');
      throw new UnauthorizedException('Authentication required');
    }

    const userId = user.id || user.sub;
    const tenantId = user.tenantId;
    console.log('[PermissionsGuard] userId:', userId, 'tenantId:', tenantId);

    if (!userId) {
      console.log('[PermissionsGuard] No userId');
      throw new ForbiddenException('Invalid user identification in token');
    }

    const userRoles = Array.isArray(user.roles) ? user.roles : [];
    console.log('[PermissionsGuard] userRoles:', userRoles);

    if (userRoles.includes('owner') || userRoles.includes('admin')) {
      console.log('[PermissionsGuard] Owner/admin bypass');
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );
    console.log('[PermissionsGuard] requiredPermissions:', requiredPermissions);

    if (!requiredPermissions?.length) {
      console.log('[PermissionsGuard] No permissions required, allowing');
      return true;
    }

    try {
      const permissions = await this.userService.getEffectivePermissions(userId, tenantId);
      const userPermissions = permissions.map(p => p.name).filter(Boolean);

      const hasPermission = requiredPermissions.some(perm => 
        userPermissions.includes(perm)
      );

      if (!hasPermission) {
        throw new ForbiddenException('Insufficient permissions');
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException('Error checking permissions');
    }
  }
}