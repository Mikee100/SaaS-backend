import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BillingService } from './billing.service';

interface CreateSubscriptionDto {
  tenantId: string;
  userId?: string | null;
  planId: string;
  paymentMethodId?: string;
}

interface UpdateSubscriptionDto {
  planId: string;
  effectiveDate?: Date;
}

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
  ) {}

  async createSubscription(data: CreateSubscriptionDto) {
    try {
      console.log('Creating subscription with data:', data);

      const plan = await this.prisma.plan.findUnique({
        where: { id: data.planId },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          interval: true,
          isActive: true,
          maxUsers: true,
          maxProducts: true,
          maxBranches: true,
          maxSalesPerMonth: true,
          stripePriceId: true,
          analyticsEnabled: true,
          advancedReports: true,
          prioritySupport: true,
          customBranding: true,
          apiAccess: true,
          bulkOperations: true,
          dataExport: true,
          customFields: true,
          advancedSecurity: true,
          whiteLabel: true,
          dedicatedSupport: true,
          ssoEnabled: true,
          auditLogs: true,
          backupRestore: true,
          customIntegrations: true,
        },
      });

      if (!plan) {
        console.error('Plan not found:', data.planId);
        throw new NotFoundException('Plan not found');
      }

      console.log('Found plan:', plan.name);

      // Check if tenant already has an active subscription
      const existingSubscription = await this.prisma.subscription.findFirst({
        where: {
          tenantId: data.tenantId,
        },
        include: {
          Plan: true,
          Tenant: true,
        },
      });

      if (existingSubscription) {
        // Removed console.log for subscription creation dates
        // Handle upgrade by updating the existing subscription
        return await this.handleUpgrade(existingSubscription, plan);
      }

      const now = new Date();
      let endDate: Date = this.calculateEndDate(plan.interval);
      let status = 'active';
      let trialEnd: Date | null = null;
      let trialStart: Date | null = null;
      let isTrial = false;

      // If the plan is a trial plan, set trialEnd to 15 days from now and status to 'trialing'
      if (plan.name.toLowerCase().includes('trial')) {
        trialEnd = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
        endDate = trialEnd;
        status = 'trialing';
        trialStart = now;
        isTrial = true;
      }

      console.log('Creating subscription with dates:', {
        now,
        endDate,
        status,
      });

      // Create new subscription
      const subscriptionData: any = {
        id: `sub_${Date.now()}`,
        tenantId: data.tenantId,
        planId: data.planId,
        status,
        currentPeriodStart: now,
        currentPeriodEnd: endDate,
        stripeSubscriptionId: 'manual_' + Date.now(), // Temp value, will be updated by webhook
        stripeCustomerId: 'cust_' + data.tenantId, // Temp value
        stripePriceId: plan.stripePriceId ?? '',
        stripeCurrentPeriodEnd: endDate,
        cancelAtPeriodEnd: false,
        trialEnd,
        trialStart,
        isTrial,
        canceledAt: null,
      };

      if (data.userId !== undefined && data.userId !== null) {
        subscriptionData.userId = data.userId;
      }

      const subscription = await this.prisma.subscription.create({
        data: subscriptionData,
        include: {
          Plan: true,
        },
      });

      console.log('Subscription created successfully:', subscription.id);
      return subscription;
    } catch (error) {
      console.error('Error in createSubscription:', error);
      throw error;
    }
  }

  async updateSubscription(tenantId: string, data: UpdateSubscriptionDto) {
    const currentSubscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: 'active',
      },
      include: {
        Plan: true,
      },
    });

    if (!currentSubscription) {
      throw new NotFoundException('No active subscription found');
    }

    const newPlan = await this.prisma.plan.findUnique({
      where: { id: data.planId },
    });

    if (!newPlan) {
      throw new NotFoundException('Plan not found');
    }

    // Get the current plan details
    const currentPlan = await this.prisma.plan.findUnique({
      where: { id: currentSubscription.planId },
    });

    if (!currentPlan) {
      throw new NotFoundException('Current plan not found');
    }

    // Handle upgrade/downgrade logic
    const isUpgrade = this.isPlanUpgrade(currentPlan.name, newPlan.name);

    if (isUpgrade) {
      // Immediate upgrade
      return await this.handleUpgrade(currentSubscription, newPlan);
    } else {
      // Schedule downgrade for next billing cycle
      return await this.handleDowngrade(
        currentSubscription,
        newPlan,
        data.effectiveDate,
      );
    }
  }

  async cancelSubscription(tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: 'active',
      },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    return await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
      },
    });
  }

  async getSubscriptionHistory(tenantId: string) {
    return await this.prisma.subscription.findMany({
      where: { tenantId },
      include: {
        Plan: true,
        Invoice: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { currentPeriodStart: 'desc' },
    });
  }

  async createInvoice(
    subscriptionId: string,
    amount: number,
    tenantId: string,
  ) {
    // Generate a unique invoice number
    const invoiceNumber = 'INV-' + Date.now();

    return await this.prisma.invoice.create({
      data: {
        id: `inv_${Date.now()}`,
        number: invoiceNumber,
        subscriptionId,
        tenantId,
        amount,
        status: 'open',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        updatedAt: new Date(),
      },
    });
  }

  private calculateEndDate(interval: string): Date {
    const now = new Date();
    switch (interval) {
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      case 'yearly':
        return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      default:
        return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }
  }

  private isPlanUpgrade(currentPlan: string, newPlan: string): boolean {
    const planHierarchy = { Basic: 1, Pro: 2, Enterprise: 3 };
    const currentLevel = planHierarchy[currentPlan] || 0;
    const newLevel = planHierarchy[newPlan] || 0;
    return newLevel > currentLevel;
  }

  private async handleUpgrade(currentSubscription: any, newPlan: any) {
    // Calculate proration
    const daysRemaining = Math.ceil(
      (currentSubscription.currentPeriodEnd.getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const totalDays = Math.ceil(
      (currentSubscription.currentPeriodEnd.getTime() -
        currentSubscription.currentPeriodStart.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const prorationRatio = daysRemaining / totalDays;

    const currentPlanPrice = currentSubscription.Plan.price;
    const newPlanPrice = newPlan.price;
    const proratedCredit = currentPlanPrice * prorationRatio;
    const proratedCharge = newPlanPrice * prorationRatio;
    const netCharge = Math.max(0, proratedCharge - proratedCredit);

    // Update subscription immediately
    const updatedSubscription = await this.prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        planId: newPlan.id,
        // Prisma will handle the updatedAt field automatically
      },
      include: {
        Plan: true,
      },
    });

    // Create invoice for the difference
    if (netCharge > 0) {
      await this.createInvoice(
        currentSubscription.id,
        netCharge,
        currentSubscription.tenantId,
      );
    }

    // Transform subscription
    const { Plan, ...sub } = updatedSubscription;
    const transformedSubscription = { ...sub, plan: Plan };

    return {
      subscription: transformedSubscription,
      proration: {
        credit: proratedCredit,
        charge: proratedCharge,
        netCharge,
      },
    };
  }

  private async handleDowngrade(
    currentSubscription: any,
    newPlan: any,
    effectiveDate?: Date,
  ) {
    const effective = effectiveDate || currentSubscription.currentPeriodEnd;

    // Schedule the downgrade by setting scheduledPlanId and scheduledEffectiveDate
    const updatedSubscription = await this.prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        scheduledPlanId: newPlan.id,
        scheduledEffectiveDate: effective,
      },
      include: {
        Plan: true,
      },
    });

    // Transform subscription
    const { Plan, ...sub } = updatedSubscription;
    const transformedSubscription = { ...sub, plan: Plan };

    return {
      message: 'Downgrade scheduled successfully',
      subscription: transformedSubscription,
      effectiveDate: effective,
      currentPlan: currentSubscription.Plan.name,
      newPlan: newPlan.name,
    };
  }

  async getCurrentSubscription(tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: 'active',
      },
      include: {
        Plan: true,
        ScheduledPlan: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    // Transform to match frontend expectations
    const { Plan, ScheduledPlan, ...sub } = subscription;
    return {
      ...sub,
      plan: Plan,
      scheduledPlan: ScheduledPlan,
    };
  }

  async upgradeSubscription(
    tenantId: string,
    planId: string,
    effectiveDate?: Date,
  ) {
    const currentSubscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: 'active',
      },
      include: {
        Plan: true,
      },
    });

    if (!currentSubscription) {
      throw new NotFoundException('No active subscription found');
    }

    const newPlan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!newPlan) {
      throw new NotFoundException('Plan not found');
    }

    const isUpgrade = this.isPlanUpgrade(
      currentSubscription.Plan.name,
      newPlan.name,
    );

    if (isUpgrade) {
      // Immediate upgrade
      return await this.handleUpgrade(currentSubscription, newPlan);
    } else {
      // Schedule downgrade
      return await this.handleDowngrade(
        currentSubscription,
        newPlan,
        effectiveDate,
      );
    }
  }

  async resumeSubscription(tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: 'active',
        cancelAtPeriodEnd: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('No cancelled subscription found to resume');
    }

    const updatedSubscription = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: false,
        canceledAt: null,
      },
      include: {
        Plan: true,
      },
    });

    // Transform
    const { Plan, ...sub } = updatedSubscription;
    return { ...sub, plan: Plan };
  }

  async getPlans() {
    const plans = await this.prisma.plan.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        interval: true,
        maxUsers: true,
        maxProducts: true,
        maxSalesPerMonth: true,
        analyticsEnabled: true,
        advancedReports: true,
        prioritySupport: true,
        customBranding: true,
        apiAccess: true,
        bulkOperations: true,
        dataExport: true,
        customFields: true,
        advancedSecurity: true,
        whiteLabel: true,
        dedicatedSupport: true,
        ssoEnabled: true,
        auditLogs: true,
        backupRestore: true,
        customIntegrations: true,
        PlanFeatureOnPlan: {
          include: {
            PlanFeature: true,
          },
        },
      },
    });

    // Transform to include features array
    return plans.map((plan) => ({
      ...plan,
      features: plan.PlanFeatureOnPlan.filter((pf) => pf.isEnabled).map(
        (pf) => pf.PlanFeature.featureName,
      ),
    }));
  }

  async getInvoices(tenantId: string) {
    return await this.prisma.invoice.findMany({
      where: { tenantId },
      include: {
        Subscription: {
          include: {
            Plan: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTrialSubscription(
    tenantId: string,
    durationHours: number,
    planId: string,
  ) {
    const now = new Date();
    const trialEnd = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        id: `trial_${Date.now()}`,
        tenantId,
        planId,
        status: 'trialing',
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        stripeSubscriptionId: 'trial_' + Date.now(),
        stripeCustomerId: 'trial_' + tenantId,
        stripePriceId: plan.stripePriceId ?? '',
        stripeCurrentPeriodEnd: trialEnd,
        cancelAtPeriodEnd: false,
        trialEnd,
        trialStart: now,
        isTrial: true,
        canceledAt: null,
      },
      include: {
        Plan: true,
      },
    });

    return subscription;
  }

  async checkTrialStatus(tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        isTrial: true,
        status: {
          in: ['trialing', 'expired'],
        },
      },
      include: {
        Plan: true,
      },
      orderBy: {
        currentPeriodStart: 'desc',
      },
    });

    if (!subscription) {
      return { isTrial: false, trialExpired: false };
    }

    const now = new Date();
    const trialExpired = subscription.trialEnd
      ? now > subscription.trialEnd
      : false;

    // Only update status if it's still 'trialing'
    if (trialExpired && subscription.status === 'trialing') {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'expired' },
      });
    }

    return {
      isTrial: true,
      trialExpired,
      trialEnd: subscription.trialEnd,
      remainingTime:
        trialExpired || !subscription.trialEnd
          ? 0
          : Math.max(0, subscription.trialEnd.getTime() - now.getTime()),
    };
  }

  async isSubscriptionValid(tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
      },
      include: {
        Plan: true,
      },
      orderBy: {
        currentPeriodStart: 'desc',
      },
    });

    if (!subscription) {
      return { valid: false, reason: 'No subscription found' };
    }

    const now = new Date();

    // Check if subscription is expired or canceled
    if (
      subscription.status === 'expired' ||
      subscription.status === 'canceled'
    ) {
      return { valid: false, reason: 'Subscription expired or canceled' };
    }

    // Check if trialing and trial has expired
    if (subscription.status === 'trialing') {
      const trialExpired = subscription.trialEnd
        ? now > subscription.trialEnd
        : false;
      if (trialExpired) {
        // Update subscription status to expired
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'expired' },
        });
        return { valid: false, reason: 'Trial period has expired' };
      }
      return {
        valid: true,
        status: 'trialing',
        remainingTime: subscription.trialEnd
          ? subscription.trialEnd.getTime() - now.getTime()
          : 0,
      };
    }

    // Check if active subscription has expired
    if (subscription.status === 'active') {
      const subscriptionExpired = subscription.currentPeriodEnd
        ? now > subscription.currentPeriodEnd
        : false;
      if (subscriptionExpired) {
        // Update subscription status to expired
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'expired' },
        });
        return { valid: false, reason: 'Subscription period has expired' };
      }
      return {
        valid: true,
        status: 'active',
        remainingTime: subscription.currentPeriodEnd
          ? subscription.currentPeriodEnd.getTime() - now.getTime()
          : 0,
      };
    }

    // For any other status, consider invalid
    return {
      valid: false,
      reason: `Invalid subscription status: ${subscription.status}`,
    };
  }

  async canAddUser(tenantId: string): Promise<boolean> {
    const subscription = await this.getCurrentSubscription(tenantId);
    if (!subscription || !subscription.plan) {
      return false;
    }

    const plan = subscription.plan;
    const maxUsers = plan.maxUsers || 0;

    if (maxUsers === 0) {
      return true; // Unlimited
    }

    const currentUsers = await this.prisma.user.count({
      where: { tenantId },
    });

    return currentUsers < maxUsers;
  }

  async canAddBranch(tenantId: string): Promise<boolean> {
    const subscription = await this.getCurrentSubscription(tenantId);
    if (!subscription || !subscription.plan) {
      return false;
    }

    const plan = subscription.plan;
    const maxBranches = plan.maxBranches || 0;

    if (maxBranches === 0) {
      return true; // Unlimited
    }

    const currentBranches = await this.prisma.branch.count({
      where: { tenantId },
    });

    return currentBranches < maxBranches;
  }

  async canAddProduct(tenantId: string): Promise<boolean> {
    const subscription = await this.getCurrentSubscription(tenantId);
    if (!subscription || !subscription.plan) {
      return false;
    }

    const plan = subscription.plan;
    const maxProducts = plan.maxProducts || 0;

    if (maxProducts === 0) {
      return true; // Unlimited
    }

    const currentProducts = await this.prisma.product.count({
      where: { tenantId },
    });

    return currentProducts < maxProducts;
  }

  async canCreateSale(tenantId: string): Promise<boolean> {
    const subscription = await this.getCurrentSubscription(tenantId);
    if (!subscription || !subscription.plan) {
      return false;
    }

    const plan = subscription.plan;
    const maxSalesPerMonth = plan.maxSalesPerMonth || 0;

    if (maxSalesPerMonth === 0) {
      return true; // Unlimited
    }

    // Count sales in current month
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    const currentMonthSales = await this.prisma.sale.count({
      where: {
        tenantId,
        createdAt: {
          gte: currentMonthStart,
        },
      },
    });

    return currentMonthSales < maxSalesPerMonth;
  }

  async getTrialUsage(tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: 'trialing',
      },
      include: {
        Plan: true,
      },
      orderBy: {
        currentPeriodStart: 'desc',
      },
    });

    if (!subscription || !subscription.isTrial || !subscription.trialStart) {
      return { isTrial: false, usage: null };
    }

    const trialStart = subscription.trialStart;
    const now = new Date();

    // Count users created during trial
    const userCount = await this.prisma.user.count({
      where: {
        tenantId,
        createdAt: {
          gte: trialStart,
        },
      },
    });

    // Count products created during trial
    const productCount = await this.prisma.product.count({
      where: {
        tenantId,
        createdAt: {
          gte: trialStart,
        },
      },
    });

    // Count branches created during trial
    const branchCount = await this.prisma.branch.count({
      where: {
        tenantId,
        createdAt: {
          gte: trialStart,
        },
      },
    });

    // Count sales in current month (for maxSalesPerMonth limit)
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const salesCount = await this.prisma.sale.count({
      where: {
        tenantId,
        createdAt: {
          gte: currentMonthStart,
        },
      },
    });

    // Get plan limits
    const plan = subscription.Plan;
    const limits = {
      maxUsers: plan.maxUsers || 0,
      maxProducts: plan.maxProducts || 0,
      maxBranches: plan.maxBranches || 0,
      maxSalesPerMonth: plan.maxSalesPerMonth || 0,
    };

    // Calculate usage percentages
    const usagePercentages = {
      users: limits.maxUsers > 0 ? (userCount / limits.maxUsers) * 100 : 0,
      products:
        limits.maxProducts > 0 ? (productCount / limits.maxProducts) * 100 : 0,
      branches:
        limits.maxBranches > 0 ? (branchCount / limits.maxBranches) * 100 : 0,
      sales:
        limits.maxSalesPerMonth > 0
          ? (salesCount / limits.maxSalesPerMonth) * 100
          : 0,
    };

    // Check if approaching limits (80% or more)
    const approachingLimits = {
      users: usagePercentages.users >= 80,
      products: usagePercentages.products >= 80,
      branches: usagePercentages.branches >= 80,
      sales: usagePercentages.sales >= 80,
    };

    return {
      isTrial: true,
      trialStart: subscription.trialStart,
      trialEnd: subscription.trialEnd,
      daysRemaining: subscription.trialEnd
        ? Math.ceil(
            (subscription.trialEnd.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0,
      usage: {
        users: {
          current: userCount,
          limit: limits.maxUsers,
          percentage: Math.round(usagePercentages.users * 100) / 100,
          approachingLimit: approachingLimits.users,
        },
        products: {
          current: productCount,
          limit: limits.maxProducts,
          percentage: Math.round(usagePercentages.products * 100) / 100,
          approachingLimit: approachingLimits.products,
        },
        branches: {
          current: branchCount,
          limit: limits.maxBranches,
          percentage: Math.round(usagePercentages.branches * 100) / 100,
          approachingLimit: approachingLimits.branches,
        },
        salesThisMonth: {
          current: salesCount,
          limit: limits.maxSalesPerMonth,
          percentage: Math.round(usagePercentages.sales * 100) / 100,
          approachingLimit: approachingLimits.sales,
        },
      },
      planName: plan.name,
    };
  }

  async getPlanLimits(tenantId: string) {
    try {
      // Count current usage first
      const userCount = await this.prisma.user.count({ where: { tenantId } });
      const productCount = await this.prisma.product.count({
        where: { tenantId },
      });
      const branchCount = await this.prisma.branch.count({
        where: { tenantId },
      });

      // Sales this month
      const currentMonthStart = new Date();
      currentMonthStart.setDate(1);
      currentMonthStart.setHours(0, 0, 0, 0);
      const salesCount = await this.prisma.sale.count({
        where: {
          tenantId,
          createdAt: { gte: currentMonthStart },
        },
      });

      // First, let's see all subscriptions for this tenant to debug
      const allSubscriptions = await this.prisma.subscription.findMany({
        where: { tenantId },
        include: { Plan: true },
        orderBy: { currentPeriodStart: 'desc' },
      });

      const subscription = await this.prisma.subscription.findFirst({
        where: {
          tenantId,
          status: {
            in: ['active', 'trialing', 'past_due'],
          },
        },
        include: {
          Plan: true,
        },
        orderBy: {
          currentPeriodStart: 'desc',
        },
      });

      let currentPlan: string | null = null;
      let features = {
        analytics: false,
        advanced_reports: false,
        custom_branding: false,
        api_access: false,
        bulk_operations: false,
        data_export: false,
        custom_fields: false,
      };

      if (subscription && subscription.Plan) {
        const plan = subscription.Plan;
        currentPlan = plan.name;
        features = {
          analytics: plan.analyticsEnabled || false,
          advanced_reports: plan.advancedReports || false,
          custom_branding: plan.customBranding || false,
          api_access: plan.apiAccess || false,
          bulk_operations: plan.bulkOperations || false,
          data_export: plan.dataExport || false,
          custom_fields: plan.customFields || false,
        };
      } else {
        console.log('No active subscription found for tenant');
      }

      const usage = {
        users: { current: userCount, limit: subscription?.Plan?.maxUsers || 1 },
        products: {
          current: productCount,
          limit: subscription?.Plan?.maxProducts || 10,
        },
        branches: {
          current: branchCount,
          limit: subscription?.Plan?.maxBranches || 1,
        },
        sales: {
          current: salesCount,
          limit: subscription?.Plan?.maxSalesPerMonth || 100,
        },
      };

      // For Basic plan, ensure the first branch and user are accounted for
      if (subscription?.Plan?.name === 'Basic') {
        usage.branches.limit = Math.max(usage.branches.limit, 1); // At least 1 branch for Basic
        usage.users.limit = Math.max(usage.users.limit, 1); // At least 1 user for Basic
      }

      return {
        currentPlan,
        usage,
        features,
      };
    } catch (error) {
      console.error('Error fetching plan limits:', error);
      // Return basic defaults on error (assuming Basic plan)
      return {
        currentPlan: 'Basic',
        usage: {
          users: { current: 1, limit: 1 }, // First user (owner) is included
          products: { current: 0, limit: 10 },
          branches: { current: 1, limit: 1 }, // First branch is included
          sales: { current: 0, limit: 100 },
        },
        features: {
          analytics: false,
          advanced_reports: false,
          custom_branding: false,
          api_access: false,
          bulk_operations: true,
          data_export: false,
          custom_fields: false,
        },
      };
    }
  }
}
