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

type MutableUser = {
  isSuperadmin?: boolean;
  tenantId?: string;
  impersonating?: boolean;
  impersonatingTenantId?: string;
  impersonatingTenantName?: string;
};

/**
 * When a superadmin has an impersonation cookie set, override req.user.tenantId
 * so all downstream code (services, controllers) see the impersonated tenant.
 */
@Injectable()
export class ImpersonationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request & { user?: MutableUser }>();
    const user = req.user;
    const cookieValues = (req.cookies ?? {}) as Record<string, unknown>;
    const tenantCookieValue = cookieValues[IMPERSONATION_COOKIE_TENANT_ID];
    const tenantId =
      typeof tenantCookieValue === 'string' ? tenantCookieValue : '';

    if (user?.isSuperadmin && tenantId) {
      const tenantNameValue = cookieValues[IMPERSONATION_COOKIE_TENANT_NAME];
      const tenantName =
        typeof tenantNameValue === 'string' ? tenantNameValue : 'Unknown';
      user.tenantId = tenantId;
      user.impersonating = true;
      user.impersonatingTenantId = tenantId;
      user.impersonatingTenantName = tenantName;
    }

    return next.handle();
  }
}
