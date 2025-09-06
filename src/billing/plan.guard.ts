import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BillingService } from './billing.service';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private billingService: BillingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // You may need to set requiredPlan/requiredFeature another way, or remove this logic
    const requiredPlan = undefined; // Reflect.getMetadata('requiredPlan', context.getHandler());
    const requiredFeature = undefined; // Reflect.getMetadata('requiredFeature', context.getHandler());

    if (requiredPlan) {
      const currentPlan = user.plan?.name || 'Basic';
      const planHierarchy = { 'Basic': 1, 'Pro': 2, 'Enterprise': 3 };
      const currentPlanLevel = planHierarchy[currentPlan] || 0;
      const requiredPlanLevel = planHierarchy[requiredPlan] || 0;

      return currentPlanLevel >= requiredPlanLevel;
    }

    if (requiredFeature) {
      return await this.billingService.hasFeature(user.tenantId, requiredFeature);
    }

    return true;
  }
}