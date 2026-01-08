import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SubscriptionAdminService {
  private readonly logger = new Logger(SubscriptionAdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAllSubscriptions() {
    try {
      const subscriptions = await this.prisma.subscription.findMany({
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
        orderBy: { createdAt: 'desc' },
      });
      
      this.logger.log(`Retrieved ${subscriptions.length} subscriptions`);
      return subscriptions;
    } catch (error) {
      this.logger.error('Error fetching all subscriptions:', error);
      this.logger.error('Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
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

  async assignPlanToTenant(tenantId: string, planId: string) {
    // Check if tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check if plan exists
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // Check for existing active subscription
    const existingSubscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: 'active',
      },
    });

    if (existingSubscription) {
      // Update existing subscription
      return await this.prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          planId: plan.id,
          scheduledPlanId: null,
          scheduledEffectiveDate: null,
        },
        include: {
          Plan: true,
        },
      });
    } else {
      // Create new subscription
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1); // Default to 1 month

      return await this.prisma.subscription.create({
        data: {
          id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
          tenantId,
          planId: plan.id,
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: endDate,
          cancelAtPeriodEnd: false,
          stripePriceId: plan.stripePriceId || '',
          stripeSubscriptionId: `manual-${tenantId}-${Date.now()}`, // Placeholder for manual assignment
          stripeCurrentPeriodEnd: endDate,
          stripeCustomerId: tenant.stripeCustomerId || '',
          trialEnd: null,
          trialStart: null,
          isTrial: false,
          userId: null, // Optional field
        },
        include: {
          Plan: true,
        },
      });
    }
  }
}
