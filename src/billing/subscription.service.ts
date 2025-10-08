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

      // If the plan is a trial plan, set trialEnd to 15 days from now and status to 'trialing'
      if (plan.name.toLowerCase().includes('trial')) {
        trialEnd = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
        endDate = trialEnd;
        status = 'trialing';
        trialStart = now;
      }

      console.log('Creating subscription with dates:', { now, endDate, status });

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
      // orderBy: { createdAt: 'desc' },
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

  async upgradeSubscription(tenantId: string, planId: string, effectiveDate?: Date) {
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

    const isUpgrade = this.isPlanUpgrade(currentSubscription.Plan.name, newPlan.name);

    if (isUpgrade) {
      // Immediate upgrade
      return await this.handleUpgrade(currentSubscription, newPlan);
    } else {
      // Schedule downgrade
      return await this.handleDowngrade(currentSubscription, newPlan, effectiveDate);
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
    return plans.map(plan => ({
      ...plan,
      features: plan.PlanFeatureOnPlan
        .filter(pf => pf.isEnabled)
        .map(pf => pf.PlanFeature.featureName),
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
}


