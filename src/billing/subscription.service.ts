import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BillingService } from './billing.service';

interface CreateSubscriptionDto {
  tenantId: string;
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
    private prisma: PrismaService,
    private billingService: BillingService,
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
          status: 'active',
        },
        include: {
          plan: true,
        },
      });

      if (existingSubscription) {
        console.log('Tenant has existing subscription, upgrading to new plan');
        // Handle upgrade by updating the existing subscription
        return await this.handleUpgrade(existingSubscription, plan);
      }

      const now = new Date();
      const endDate = this.calculateEndDate(plan.interval);

      console.log('Creating subscription with dates:', { now, endDate });

      // Create new subscription
      const subscription = await this.prisma.subscription.create({
        data: {
          tenantId: data.tenantId,
          planId: data.planId,
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: endDate,
          stripeSubscriptionId: 'manual_' + Date.now(), // Temp value, will be updated by webhook
          stripeCustomerId: 'cust_' + data.tenantId, // Temp value
          stripePriceId: plan.stripePriceId,
          stripeCurrentPeriodEnd: endDate,
          cancelAtPeriodEnd: false,
          userId: 'system', // This should be the admin user ID
        },
        include: {
          plan: true,
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
        plan: true,
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

    // Handle upgrade/downgrade logic
    const isUpgrade = this.isPlanUpgrade(currentSubscription.plan.name, newPlan.name);
    
    if (isUpgrade) {
      // Immediate upgrade
      return await this.handleUpgrade(currentSubscription, newPlan);
    } else {
      // Schedule downgrade for next billing cycle
      return await this.handleDowngrade(currentSubscription, newPlan, data.effectiveDate);
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
        status: 'cancelled',
        canceledAt: new Date(),
      },
    });
  }

  async getSubscriptionHistory(tenantId: string) {
    return await this.prisma.subscription.findMany({
      where: { tenantId },
      include: {
        plan: true,
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
  // orderBy: { createdAt: 'desc' },
    });
  }

  async createInvoice(subscriptionId: string, amount: number, tenantId: string) {
    // Generate a unique invoice number
    const invoiceNumber = 'INV-' + Date.now();
    
    return await this.prisma.invoice.create({
      data: {
        number: invoiceNumber,
        subscriptionId,
        tenantId,
        amount,
        status: 'open',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        createdAt: new Date(),
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
    const planHierarchy = { 'Basic': 1, 'Pro': 2, 'Enterprise': 3 };
    const currentLevel = planHierarchy[currentPlan] || 0;
    const newLevel = planHierarchy[newPlan] || 0;
    return newLevel > currentLevel;
  }

  private async handleUpgrade(currentSubscription: any, newPlan: any) {
    // Calculate proration
    const daysRemaining = Math.ceil((currentSubscription.currentPeriodEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const totalDays = Math.ceil((currentSubscription.currentPeriodEnd.getTime() - currentSubscription.currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
    const prorationRatio = daysRemaining / totalDays;

    const currentPlanPrice = currentSubscription.plan.price;
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
        plan: true,
      },
    });

    // Create invoice for the difference
    if (netCharge > 0) {
      await this.createInvoice(currentSubscription.id, netCharge, currentSubscription.tenantId);
    }

    return {
      subscription: updatedSubscription,
      proration: {
        credit: proratedCredit,
        charge: proratedCharge,
        netCharge,
      },
    };
  }

  private async handleDowngrade(currentSubscription: any, newPlan: any, effectiveDate?: Date) {
    const effective = effectiveDate || currentSubscription.currentPeriodEnd;

    // For now, just return a message about scheduling
    // TODO: Implement proper downgrade scheduling when schema supports it
    return {
      message: 'Downgrade scheduled for next billing cycle',
      effectiveDate: effective,
      currentPlan: currentSubscription.plan.name,
      newPlan: newPlan.name,
    };
  }
} 