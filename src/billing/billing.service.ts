import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}
  // ADMIN: Get all tenants and their subscriptions
  async getAllTenantSubscriptions() {
    // Get all tenants
    const tenants = await this.prisma.tenant.findMany({
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { currentPeriodStart: 'desc' },
        },
      },
    });

    // Map tenants to subscription info with more billing details
    return Promise.all(tenants.map(async tenant => {
  // Get the most recent subscription, even if canceled or expired
  const sub = tenant.subscriptions?.[0];
      // Get last invoice
      const lastInvoice = sub ? await this.prisma.invoice.findFirst({
        where: { subscriptionId: sub.id },
        orderBy: { createdAt: 'desc' },
      }) : null;
      // Get last payment
      const lastPayment = await this.prisma.payment.findFirst({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: 'desc' },
      });
      return {
        tenantId: tenant.id,
        clientName: tenant.name,
        clientEmail: tenant.contactEmail,
        plan: sub?.plan ? {
          name: sub.plan.name,
          price: sub.plan.price,
          interval: sub.plan.interval,
          features: {
            maxUsers: sub.plan.maxUsers,
            maxProducts: sub.plan.maxProducts,
            maxSalesPerMonth: sub.plan.maxSalesPerMonth,
            analyticsEnabled: sub.plan.analyticsEnabled,
            advancedReports: sub.plan.advancedReports,
            prioritySupport: sub.plan.prioritySupport,
            customBranding: sub.plan.customBranding,
            apiAccess: sub.plan.apiAccess,
          },
        } : null,
        status: sub?.status || 'none',
        startDate: sub?.currentPeriodStart,
        currentPeriodEnd: sub?.currentPeriodEnd,
        cancelAtPeriodEnd: sub?.cancelAtPeriodEnd || false,
        lastInvoice: lastInvoice ? {
          id: lastInvoice.id,
          amount: lastInvoice.amount,
          status: lastInvoice.status,
          dueDate: lastInvoice.dueDate,
          paidAt: lastInvoice.paidAt,
        } : null,
        lastPayment: lastPayment ? {
          id: lastPayment.id,
          amount: lastPayment.amount,
          currency: lastPayment.currency,
          status: lastPayment.status,
          completedAt: lastPayment.completedAt,
        } : null,
      };
    }));
  }

  async getPlans() {
    try {
      const plans = await this.prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { price: 'asc' },
        include: {
          features: {
            include: {
              feature: true
            }
          }
        }
      });
      // Map features to array of feature names for frontend
      return plans.map(plan => ({
        ...plan,
        features: plan.features?.filter(f => f.isEnabled).map(f => f.feature.featureName) || []
      }));
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
          features: ['Basic Usage'],
        },
        {
          id: 'pro-plan',
          name: 'Pro',
          price: 29,
          interval: 'monthly',
          maxUsers: 25,
          maxProducts: 500,
          maxSalesPerMonth: 1000,
          features: ['Advanced Analytics', 'Data Export'],
        },
        {
          id: 'enterprise-plan',
          name: 'Enterprise',
          price: 99,
          interval: 'monthly',
          maxUsers: null,
          maxProducts: null,
          maxSalesPerMonth: null,
          features: ['All Features'],
        },
      ];
    }
  }

  async getCurrentSubscription(tenantId: string) {
    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          tenantId,
          status: { in: ['active', 'past_due', 'trialing'] },
        },
        include: {
          plan: true,
        },
        orderBy: {
          currentPeriodStart: 'desc',
        },
      });

      if (!subscription || !subscription.plan) {
        return {
          plan: { name: 'Basic', price: 0, id: 'free-tier' },
          status: 'none',
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        };
      }

      return {
        ...subscription,
        plan: subscription.plan,
      };
    } catch (error) {
      console.error('Error getting current subscription:', error);
      return {
        plan: { name: 'Basic', price: 0, id: 'free-tier' },
        status: 'none',
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }
  }

  async hasFeature(tenantId: string, feature: string): Promise<boolean> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId },
      include: { 
        plan: true 
      },
      orderBy: { 
        currentPeriodStart: 'desc' 
      },
    });

    if (!subscription || !subscription.plan) {
      return false;
    }

    const plan = subscription.plan;
    
    switch (feature) {
      // Core features
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
      
      // New granular features
      case 'bulk_operations':
        return plan.bulkOperations || false;
      case 'data_export':
        return plan.dataExport || false;
      case 'custom_fields':
        return plan.customFields || false;
      case 'advanced_security':
        return plan.advancedSecurity || false;
      case 'white_label':
        return plan.whiteLabel || false;
      case 'dedicated_support':
        return plan.dedicatedSupport || false;
      case 'sso_enabled':
        return plan.ssoEnabled || false;
      case 'audit_logs':
        return plan.auditLogs || false;
      case 'backup_restore':
        return plan.backupRestore || false;
      case 'custom_integrations':
        return plan.customIntegrations || false;
      
      // Enterprise-specific features
      case 'enterprise_branding':
        return plan.customBranding && plan.whiteLabel;
      case 'full_api_access':
        return plan.apiAccess && plan.customIntegrations;
      case 'advanced_analytics':
        return plan.analyticsEnabled && plan.advancedReports;
      case 'security_audit':
        return plan.advancedSecurity && plan.auditLogs;
      
      default:
        return false;
    }
  }

  async getPlanLimits(tenantId: string) {
    try {
  // ...existing code...
      
      const subscription = await this.prisma.subscription.findFirst({
        where: { tenantId },
        include: { 
          plan: true 
        },
        orderBy: { 
          currentPeriodStart: 'desc' 
        },
      });

      if (!subscription || !subscription.plan) {
        return {
          maxUsers: 3,
          maxProducts: 100,
          maxSalesPerMonth: 200,
          analyticsEnabled: false,
          advancedReports: false,
          prioritySupport: false,
          customBranding: false,
          apiAccess: false,
          // New granular features
          bulkOperations: false,
          dataExport: false,
          customFields: false,
          advancedSecurity: false,
          whiteLabel: false,
          dedicatedSupport: false,
          ssoEnabled: false,
          auditLogs: false,
          backupRestore: false,
          customIntegrations: false,
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
        // New granular features
        bulkOperations: plan.bulkOperations || false,
        dataExport: plan.dataExport || false,
        customFields: plan.customFields || false,
        advancedSecurity: plan.advancedSecurity || false,
        whiteLabel: plan.whiteLabel || false,
        dedicatedSupport: plan.dedicatedSupport || false,
        ssoEnabled: plan.ssoEnabled || false,
        auditLogs: plan.auditLogs || false,
        backupRestore: plan.backupRestore || false,
        customIntegrations: plan.customIntegrations || false,
      };
    } catch (error) {
      throw error;
    }
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

  async getEnterpriseFeatures(tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId },
      include: { 
        plan: true 
      },
      orderBy: { 
        currentPeriodStart: 'desc' 
      },
    });

    if (!subscription || !subscription.plan || subscription.plan.name !== 'Enterprise') {
      return null;
    }

    return {
      customBranding: {
        enabled: subscription.plan.customBranding,
        features: ['logo', 'colors', 'domain', 'white_label']
      },
      apiAccess: {
        enabled: subscription.plan.apiAccess,
        features: ['rest_api', 'webhooks', 'custom_integrations', 'rate_limits']
      },
      security: {
        enabled: subscription.plan.advancedSecurity,
        features: ['sso', 'audit_logs', 'backup_restore', 'encryption']
      },
      support: {
        enabled: subscription.plan.dedicatedSupport,
        features: ['24_7_support', 'dedicated_manager', 'priority_queue']
      }
    };
  }

  async getInvoices(tenantId: string) {
    try {
      const invoices = await this.prisma.invoice.findMany({
        where: {
          tenantId,
          status: { in: ['paid', 'open', 'void'] },
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      });

      return invoices.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        amount: invoice.amount,
        status: invoice.status,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
        createdAt: invoice.createdAt,
        subscription: invoice.subscriptionId ? {
          id: invoice.subscriptionId,
          plan: invoice.subscription?.plan ? {
            name: invoice.subscription.plan.name,
            price: invoice.subscription.plan.price,
          } : null,
        } : null,
      }));
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  }

  async getPlanFeatures(planId: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // Return all plan features directly from the plan
    return {
      analyticsEnabled: plan.analyticsEnabled,
      advancedReports: plan.advancedReports,
      prioritySupport: plan.prioritySupport,
      customBranding: plan.customBranding,
      apiAccess: plan.apiAccess,
      bulkOperations: plan.bulkOperations,
      dataExport: plan.dataExport,
      customFields: plan.customFields,
      advancedSecurity: plan.advancedSecurity,
      whiteLabel: plan.whiteLabel,
      dedicatedSupport: plan.dedicatedSupport,
      ssoEnabled: plan.ssoEnabled,
      auditLogs: plan.auditLogs,
      backupRestore: plan.backupRestore,
      customIntegrations: plan.customIntegrations,
    };
  }

  async getSubscriptionFeatures(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Return features directly from the plan
    return {
      customBranding: subscription.plan.customBranding,
      apiAccess: subscription.plan.apiAccess,
      advancedSecurity: subscription.plan.advancedSecurity,
      dedicatedSupport: subscription.plan.dedicatedSupport,
    };
  }
}