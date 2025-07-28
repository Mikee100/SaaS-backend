import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlans() {
    try {
      return await this.prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { price: 'asc' },
      });
    } catch (error) {
      console.error('Error fetching plans:', error);
      // Return default plans if database is not ready
      return [
        {
          id: 'basic-plan',
          name: 'Basic',
          price: 0,
          interval: 'monthly',
          maxUsers: 5,
          maxProducts: 50,
          maxSalesPerMonth: 100,
          analyticsEnabled: false,
          advancedReports: false,
          prioritySupport: false,
          customBranding: false,
          apiAccess: false,
        },
        {
          id: 'pro-plan',
          name: 'Pro',
          price: 29,
          interval: 'monthly',
          maxUsers: 25,
          maxProducts: 500,
          maxSalesPerMonth: 1000,
          analyticsEnabled: true,
          advancedReports: true,
          prioritySupport: false,
          customBranding: false,
          apiAccess: false,
        },
        {
          id: 'enterprise-plan',
          name: 'Enterprise',
          price: 99,
          interval: 'monthly',
          maxUsers: 100,
          maxProducts: 2000,
          maxSalesPerMonth: 5000,
          analyticsEnabled: true,
          advancedReports: true,
          prioritySupport: true,
          customBranding: true,
          apiAccess: true,
        },
      ];
    }
  }

  async getCurrentSubscription(tenantId: string) {
    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          tenantId,
          status: 'active',
        },
        include: {
          plan: true,
        },
      });

      if (!subscription) {
        return {
          plan: { name: 'Basic', price: 0 },
          status: 'none',
          currentPeriodStart: null,
          currentPeriodEnd: null,
        };
      }

      return {
        id: subscription.id,
        status: subscription.status,
        plan: subscription.plan,
        startDate: subscription.currentPeriodStart,
        endDate: subscription.currentPeriodEnd,
        cancelledAt: subscription.cancelledAt,
      };
    } catch (error) {
      console.error('Error fetching subscription:', error);
      return {
        plan: { name: 'Basic', price: 0 },
        status: 'none',
        currentPeriodStart: null,
        currentPeriodEnd: null,
      };
    }
  }

  async hasFeature(tenantId: string, feature: string): Promise<boolean> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return false;
    }

    const plan = subscription.plan;
    
    switch (feature) {
      case 'analytics':
        return plan.analyticsEnabled;
      case 'advanced_reports':
        return plan.advancedReports;
      case 'priority_support':
        return plan.prioritySupport;
      case 'custom_branding':
        return plan.customBranding;
      case 'api_access':
        return plan.apiAccess;
      default:
        return false;
    }
  }

  async getPlanLimits(tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return {
        maxUsers: 3,
        maxProducts: 100,
        maxSalesPerMonth: 200,
        analyticsEnabled: false,
        advancedReports: false,
        prioritySupport: false,
        customBranding: false,
        apiAccess: false,
      };
    }

    const plan = subscription.plan;
    return {
      maxUsers: plan.maxUsers,
      maxProducts: plan.maxProducts,
      maxSalesPerMonth: plan.maxSalesPerMonth,
      analyticsEnabled: plan.analyticsEnabled,
      advancedReports: plan.advancedReports,
      prioritySupport: plan.prioritySupport,
      customBranding: plan.customBranding,
      apiAccess: plan.apiAccess,
    };
  }

  async checkLimit(tenantId: string, limitType: 'users' | 'products' | 'sales'): Promise<{ allowed: boolean; current: number; limit: number }> {
    const limits = await this.getPlanLimits(tenantId);
    
    let current = 0;
    let limit = 0;

    switch (limitType) {
      case 'users':
        current = await this.prisma.userRole.count({ where: { tenantId } });
        limit = limits.maxUsers || 3;
        break;
      case 'products':
        current = await this.prisma.product.count({ where: { tenantId } });
        limit = limits.maxProducts || 100;
        break;
      case 'sales':
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        current = await this.prisma.sale.count({
          where: {
            tenantId,
            createdAt: { gte: startOfMonth }
          }
        });
        limit = limits.maxSalesPerMonth || 200;
        break;
    }

    return {
      allowed: limit === null || current < limit,
      current,
      limit: limit === null ? Infinity : limit,
    };
  }

  async getInvoices(tenantId: string) {
    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          tenantId,
          status: 'active',
        },
      });

      if (!subscription) {
        return [];
      }

      return await this.prisma.invoice.findMany({
        where: {
          subscriptionId: subscription.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }
} 