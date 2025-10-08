import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SubscriptionAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllSubscriptions() {
    return await this.prisma.subscription.findMany({
      include: {
        Plan: true,
        Tenant: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
          },
        },
        ScheduledPlan: true,
      },
      orderBy: { currentPeriodStart: 'desc' },
    });
  }

  async getSubscriptionById(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        Plan: true,
        Tenant: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            users: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        ScheduledPlan: true,
        Invoice: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  async getTenantUsage(tenantId: string) {
    const [userCount, productCount, salesCount] = await Promise.all([
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.product.count({ where: { tenantId } }),
      this.prisma.sale.count({ where: { tenantId } }),
    ]);

    return {
      tenantId,
      userCount,
      productCount,
      salesCount,
    };
  }

  async forceSubscriptionUpdate(tenantId: string, planId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: 'active',
      },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found for tenant');
    }

    const newPlan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!newPlan) {
      throw new NotFoundException('Plan not found');
    }

    return await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        planId: newPlan.id,
        scheduledPlanId: null,
        scheduledEffectiveDate: null,
      },
      include: {
        Plan: true,
      },
    });
  }

  async cancelScheduledChange(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        scheduledPlanId: null,
        scheduledEffectiveDate: null,
      },
    });
  }
}
