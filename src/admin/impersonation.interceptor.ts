import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

export const IMPERSONATION_COOKIE_TENANT_ID = 'impersonation_tenant_id';
export const IMPERSONATION_COOKIE_TENANT_NAME = 'impersonation_tenant_name';

/**
 * When a superadmin has an impersonation cookie set, override req.user.tenantId
 * so all downstream code (services, controllers) see the impersonated tenant.
 */
@Injectable()
export class ImpersonationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const user = req.user as any;

    if (user?.isSuperadmin && req.cookies?.[IMPERSONATION_COOKIE_TENANT_ID]) {
      const tenantId = req.cookies[IMPERSONATION_COOKIE_TENANT_ID];
      const tenantName = req.cookies[IMPERSONATION_COOKIE_TENANT_NAME] || 'Unknown';
      user.tenantId = tenantId;
      user.impersonating = true;
      user.impersonatingTenantId = tenantId;
      user.impersonatingTenantName = tenantName;
    }

    return next.handle();
  }
}
