import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BillingService } from './billing.service';
import { AuthenticatedRequest } from '../auth/request.types';

type PlanName = 'Basic' | 'Pro' | 'Enterprise';
type GuardUser = AuthenticatedRequest['user'] & {
  plan?: { name?: string };
};

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private billingService: BillingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user as GuardUser | undefined;

    if (!user) {
      return false;
    }

    // You may need to set requiredPlan/requiredFeature another way, or remove this logic
    const requiredPlan = this.reflector.get<PlanName | undefined>(
      'requiredPlan',
      context.getHandler(),
    );
    const requiredFeature = this.reflector.get<string | undefined>(
      'requiredFeature',
      context.getHandler(),
    );

    if (requiredPlan) {
      const rawCurrentPlan = user.plan?.name;
      const currentPlan: PlanName =
        rawCurrentPlan === 'Pro' || rawCurrentPlan === 'Enterprise'
          ? rawCurrentPlan
          : 'Basic';

      const planHierarchy: Record<PlanName, number> = {
        Basic: 1,
        Pro: 2,
        Enterprise: 3,
      };
      const currentPlanLevel = planHierarchy[currentPlan];
      const requiredPlanLevel = planHierarchy[requiredPlan];

      return currentPlanLevel >= requiredPlanLevel;
    }

    if (requiredFeature) {
      if (!user.tenantId) {
        return false;
      }
      return await this.billingService.hasFeature(
        user.tenantId,
        requiredFeature,
      );
    }

    return true;
  }
}
