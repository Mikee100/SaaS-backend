import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuthenticatedRequest } from '../auth/request.types';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const tenantId = request.user?.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Tenant information missing');
    }

    // Fetch active subscription for tenant
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: {
          in: ['active', 'trialing', 'past_due'],
        },
      },
      select: {
        status: true,
        currentPeriodEnd: true,
      },
    });

    if (!subscription) {
      throw new ForbiddenException('No active or trial subscription found');
    }

    // For past_due subscriptions, allow temporary access only until period end.
    if (
      subscription.status === 'past_due' &&
      subscription.currentPeriodEnd < new Date()
    ) {
      throw new ForbiddenException('Subscription payment is overdue');
    }

    // Resource-count limits (maxUsers, maxBranches, maxProducts,
    // maxSalesPerMonth) are enforced at the point of creation in each
    // resource's own service (see user.service.ts, branch.service.ts,
    // product.service.ts, sales.service.ts via SubscriptionService.canAddX),
    // not here — this guard only asserts that a subscription is active.
    // Route-wide suspension/expiry is also already enforced globally by
    // JwtStrategy for every authenticated, non-billing route. Apply this
    // guard in addition to that when a specific route should be blocked
    // outright rather than allowed through with a restricted-mode response.
    return true;
  }
}
