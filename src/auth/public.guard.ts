import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PublicGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Check if it's an auth route that should be public
    const request = context.switchToHttp().getRequest();
    const url = request.url;

    // Allow these auth routes without authentication
    const publicRoutes = [
      '/auth/login',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/register',
    ];

    return publicRoutes.some((route) => url.startsWith(route));
  }
}
