import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Tenant information missing');
    }

    // Fetch active subscription for tenant
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: 'active',
      },
      include: {
        Plan: true,
      },
    });

    if (!subscription) {
      throw new ForbiddenException('No active subscription found');
    }

    const plan = subscription.Plan;

    // Example enforcement: check maxUsers limit
    // This is a placeholder, actual enforcement logic depends on the resource being accessed
    // For example, if accessing user management, check current user count vs maxUsers

    // You can extend this guard to check other limits like maxProducts, maxSalesPerMonth, etc.

    // If all checks pass
    return true;
  }
}
