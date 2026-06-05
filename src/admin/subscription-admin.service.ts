import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

interface BillingOpsFilters {
  search?: string;
  state?: string;
  suspendedOnly?: boolean;
}

interface RecordManualPaymentInput {
  amount: number;
  currency?: string;
  method?: string;
  referenceCode?: string;
  payerName?: string;
  receiptUrl?: string;
  notes?: string;
  months?: number;
  applyNow?: boolean;
  reason?: string;
  planId?: string;
  receiptUploadFailed?: boolean;
  receiptUploadError?: string;
}

interface ReconciliationFilters {
  search?: string;
  tenantId?: string;
  overdueOnly?: boolean;
  mismatchOnly?: boolean;
}

interface CreateManualInvoiceInput {
  amount: number;
  status?: 'draft' | 'issued' | 'paid' | 'void';
  dueDate?: string;
  subscriptionId?: string;
  paymentId?: string;
  notes?: string;
}

@Injectable()
export class SubscriptionAdminService {
  private readonly logger = new Logger(SubscriptionAdminService.name);
  private static readonly BASE_GRACE_DAYS = 3;

  constructor(private readonly prisma: PrismaService) {}

  // Returns all subscriptions with a scheduled plan change, including tenant info, user count, and new plan user limit
  async getAllScheduledPlanChanges() {
    const scheduledSubs = await this.prisma.subscription.findMany({
      where: {
        scheduledPlanId: { not: null },
        scheduledEffectiveDate: { not: null },
      },
      include: {
        Plan: true,
        ScheduledPlan: true,
        Tenant: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            users: { select: { id: true } },
          },
        },
      },
      orderBy: { scheduledEffectiveDate: 'asc' },
    });

    // For each, return relevant info and highlight if user count exceeds new plan limit
    return scheduledSubs.map((sub) => {
      const userCount = sub.Tenant.users.length;
      const newPlanUserLimit = sub.ScheduledPlan?.maxUsers ?? null;
      return {
        tenantId: sub.Tenant.id,
        tenantName: sub.Tenant.name,
        tenantEmail: sub.Tenant.contactEmail,
        subscriptionId: sub.id,
        currentPlan: sub.Plan?.name,
        scheduledPlan: sub.ScheduledPlan?.name,
        scheduledEffectiveDate: sub.scheduledEffectiveDate,
        userCount,
        newPlanUserLimit,
        overLimit: newPlanUserLimit !== null && userCount > newPlanUserLimit,
      };
    });
  }

  async getTenantBillingOperationsOverview(filters: BillingOpsFilters = {}) {
    const search = (filters.search || '').trim();
    const where: Prisma.TenantWhereInput = {
      deletedAt: null,
    };

    if (filters.suspendedOnly) {
      where.isSuspended = true;
    }

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          contactEmail: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const tenants = await this.prisma.tenant.findMany({
      where,
      select: {
        id: true,
        name: true,
        contactEmail: true,
        isSuspended: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
          },
        },
        Subscription: {
          orderBy: {
            currentPeriodStart: 'desc',
          },
          take: 1,
          include: {
            Plan: true,
          },
        },
      },
    });

    const now = new Date();

    const mapped = await Promise.all(
      tenants.map(async (tenant) => {
        const sub = tenant.Subscription?.[0] || null;
        const extensionDays = sub
          ? await this.getExtraGraceDays(
              tenant.id,
              sub.currentPeriodStart,
              sub.id,
            )
          : 0;

        const baseGraceDays = SubscriptionAdminService.BASE_GRACE_DAYS;
        const totalGraceDays = baseGraceDays + extensionDays;

        const currentPeriodEnd = sub?.currentPeriodEnd || null;
        const graceEndsAt = currentPeriodEnd
          ? this.addDays(currentPeriodEnd, totalGraceDays)
          : null;

        const daysToNextBilling =
          currentPeriodEnd && currentPeriodEnd > now
            ? Math.ceil(
                (currentPeriodEnd.getTime() - now.getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : 0;

        const daysSinceExpiry =
          currentPeriodEnd && currentPeriodEnd < now
            ? Math.ceil(
                (now.getTime() - currentPeriodEnd.getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : 0;

        const inGrace =
          !!currentPeriodEnd &&
          currentPeriodEnd < now &&
          !!graceEndsAt &&
          now <= graceEndsAt;

        const overGrace = !!graceEndsAt && now > graceEndsAt;

        const billingState = !sub
          ? 'no_subscription'
          : currentPeriodEnd && currentPeriodEnd > now
            ? 'active'
            : inGrace
              ? 'in_grace'
              : overGrace
                ? 'expired_over_grace'
                : 'expired';

        return {
          tenantId: tenant.id,
          tenantName: tenant.name,
          tenantEmail: tenant.contactEmail,
          billingCycle: 'monthly',
          planName: sub?.Plan?.name || null,
          planPrice: sub?.Plan?.price || 0,
          subscriptionId: sub?.id || null,
          subscriptionStatus: sub?.status || null,
          currentPeriodStart: sub?.currentPeriodStart || null,
          currentPeriodEnd,
          nextBillingDate: currentPeriodEnd,
          daysToNextBilling,
          daysSinceExpiry,
          baseGraceDays,
          extensionGraceDays: extensionDays,
          totalGraceDays,
          graceEndsAt,
          billingState,
          inGrace,
          overGrace,
          isSuspended: tenant.isSuspended,
          linkedAccountsCount: tenant._count.users,
          accountActionLabel: tenant.isSuspended
            ? 'Remove access restriction'
            : 'Restrict access',
        };
      }),
    );

    const state = (filters.state || 'all').toLowerCase();
    return mapped.filter(
      (item) => state === 'all' || item.billingState === state,
    );
  }

  async reactivateTenantBillingAccess(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, isSuspended: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    await this.prisma.$transaction([
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: { isSuspended: false },
      }),
      this.prisma.notification.create({
        data: {
          id: this.newId('notif'),
          tenantId,
          type: 'subscription_manual_reactivation',
          title: 'Tenant reactivated by admin',
          message: 'Admin removed billing access restrictions for this tenant.',
        },
      }),
    ]);

    return {
      success: true,
      message: 'Tenant access restriction removed',
      tenantId,
    };
  }

  async suspendTenantBillingAccess(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    await this.prisma.$transaction([
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: { isSuspended: true },
      }),
      this.prisma.notification.create({
        data: {
          id: this.newId('notif'),
          tenantId,
          type: 'subscription_manual_suspension',
          title: 'Tenant suspended by admin',
          message: 'Admin manually restricted billing access for this tenant.',
        },
      }),
    ]);

    return {
      success: true,
      message: 'Tenant access restricted',
      tenantId,
    };
  }

  async extendTenantGracePeriod(
    tenantId: string,
    days: number,
    reason?: string,
  ) {
    const normalizedDays = Math.max(1, Math.min(365, Math.floor(days)));

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        isSuspended: true,
        Subscription: {
          orderBy: {
            currentPeriodStart: 'desc',
          },
          take: 1,
          select: {
            id: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const subscription = tenant.Subscription?.[0];
    if (!subscription) {
      throw new NotFoundException('No subscription found for tenant');
    }

    const currentExtensionDays = await this.getExtraGraceDays(
      tenantId,
      subscription.currentPeriodStart,
      subscription.id,
    );

    const totalGraceDays =
      SubscriptionAdminService.BASE_GRACE_DAYS +
      currentExtensionDays +
      normalizedDays;
    const newGraceEndsAt = this.addDays(
      subscription.currentPeriodEnd,
      totalGraceDays,
    );
    const now = new Date();

    const tx: any[] = [
      this.prisma.notification.create({
        data: {
          id: this.newId('notif'),
          tenantId,
          type: 'subscription_grace_extension',
          title: 'Grace period extended',
          message: `Admin extended grace period by ${normalizedDays} day(s).`,
          data: {
            days: normalizedDays,
            reason: reason || 'No reason provided',
            subscriptionId: subscription.id,
            subscriptionPeriodStart: subscription.currentPeriodStart,
            subscriptionPeriodEnd: subscription.currentPeriodEnd,
          },
        },
      }),
    ];

    if (tenant.isSuspended && now <= newGraceEndsAt) {
      tx.push(
        this.prisma.tenant.update({
          where: { id: tenantId },
          data: { isSuspended: false },
        }),
      );
      tx.push(
        this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status:
              subscription.currentPeriodEnd < now
                ? 'past_due'
                : subscription.status,
          },
        }),
      );
    }

    await this.prisma.$transaction(tx);

    return {
      success: true,
      tenantId,
      subscriptionId: subscription.id,
      extensionDaysAdded: normalizedDays,
      totalGraceDays,
      graceEndsAt: newGraceEndsAt,
      message: `Grace period extended by ${normalizedDays} day(s).`,
    };
  }

  async manuallyRenewTenantSubscription(
    tenantId: string,
    months = 1,
    reason?: string,
    planId?: string,
    manualPayment?: {
      amount?: number;
      currency?: string;
      method?: string;
      referenceCode?: string;
      payerName?: string;
      receiptUrl?: string;
      notes?: string;
      paymentId?: string;
    },
  ) {
    const normalizedMonths = Math.max(1, Math.min(24, Math.floor(months)));

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        stripeCustomerId: true,
        isSuspended: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    let subscription = await this.prisma.subscription.findFirst({
      where: { tenantId },
      orderBy: { currentPeriodStart: 'desc' },
      include: {
        Plan: true,
      },
    });

    if (!subscription && !planId) {
      throw new BadRequestException(
        'No existing subscription found. Provide a planId to create a manual monthly subscription.',
      );
    }

    const now = new Date();
    const tx: any[] = [];

    if (!subscription && planId) {
      const plan = await this.prisma.plan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        throw new NotFoundException('Plan not found for manual renewal');
      }

      const periodStart = now;
      const periodEnd = this.addMonths(periodStart, normalizedMonths);

      const created = await this.prisma.subscription.create({
        data: {
          id: this.newId('sub'),
          tenantId,
          planId: plan.id,
          status: 'active',
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          canceledAt: null,
          stripePriceId: plan.stripePriceId || '',
          stripeSubscriptionId: `manual-${tenantId}-${Date.now()}`,
          stripeCurrentPeriodEnd: periodEnd,
          stripeCustomerId: tenant.stripeCustomerId || '',
          isTrial: false,
          userId: null,
        },
        include: {
          Plan: true,
        },
      });

      subscription = created;
    } else if (subscription) {
      const anchorStart =
        subscription.currentPeriodEnd && subscription.currentPeriodEnd > now
          ? subscription.currentPeriodEnd
          : now;
      const nextEnd = this.addMonths(anchorStart, normalizedMonths);

      tx.push(
        this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'active',
            cancelAtPeriodEnd: false,
            canceledAt: null,
            currentPeriodStart: anchorStart,
            currentPeriodEnd: nextEnd,
            stripeCurrentPeriodEnd: nextEnd,
            trialStart: null,
            trialEnd: null,
            isTrial: false,
          },
        }),
      );
    }

    tx.push(
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: { isSuspended: false },
      }),
    );

    tx.push(
      this.prisma.notification.create({
        data: {
          id: this.newId('notif'),
          tenantId,
          type: 'subscription_manual_renewal',
          title: 'Manual subscription renewal recorded',
          message: `Admin recorded off-system payment and renewed subscription for ${normalizedMonths} month(s).`,
          data: {
            months: normalizedMonths,
            reason: reason || 'Off-system payment received',
            planId: subscription?.planId || planId || null,
          },
        },
      }),
    );

    await this.prisma.$transaction(tx);

    const updated = await this.prisma.subscription.findFirst({
      where: { tenantId },
      orderBy: { currentPeriodStart: 'desc' },
      include: { Plan: true },
    });

    const invoiceAmount =
      manualPayment?.amount && Number.isFinite(manualPayment.amount)
        ? Number(manualPayment.amount)
        : Number(updated?.Plan?.price || 0) * normalizedMonths;

    const createdInvoice = await this.prisma.invoice.create({
      data: {
        id: this.newId('inv'),
        number: `INV-MAN-${Date.now()}`,
        tenantId,
        subscriptionId: updated?.id || null,
        amount: Math.max(0, invoiceAmount),
        status: 'paid',
        dueDate: now,
        paidAt: now,
        updatedAt: now,
      },
    });

    if (manualPayment?.paymentId) {
      const existingPayment = await this.prisma.payment.findUnique({
        where: { id: manualPayment.paymentId },
        select: { metadata: true },
      });

      const metadata =
        existingPayment &&
        existingPayment.metadata &&
        typeof existingPayment.metadata === 'object'
          ? (existingPayment.metadata as Record<string, unknown>)
          : {};

      await this.prisma.payment.update({
        where: { id: manualPayment.paymentId },
        data: {
          status: 'completed',
          completedAt: now,
          description: `Manual subscription payment applied (${normalizedMonths} month(s))`,
          metadata: {
            ...metadata,
            appliedToSubscription: true,
            appliedAt: now.toISOString(),
            renewedMonths: normalizedMonths,
            subscriptionId: updated?.id || null,
            invoiceId: createdInvoice.id,
          },
        },
      });
    }

    return {
      success: true,
      tenantId,
      subscriptionId: updated?.id || null,
      planName: updated?.Plan?.name || null,
      renewedMonths: normalizedMonths,
      currentPeriodStart: updated?.currentPeriodStart || null,
      currentPeriodEnd: updated?.currentPeriodEnd || null,
      invoiceId: createdInvoice.id,
      invoiceNumber: createdInvoice.number,
      invoiceAmount: createdInvoice.amount,
      message: `Manual renewal applied for ${normalizedMonths} month(s). Access is active.`,
    };
  }

  async recordManualPayment(tenantId: string, input: RecordManualPaymentInput) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        Subscription: {
          orderBy: { currentPeriodStart: 'desc' },
          take: 1,
          select: {
            id: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new BadRequestException('amount must be a positive number');
    }

    const latestSubscription = tenant.Subscription?.[0] || null;
    const now = new Date();
    const normalizedMonths = Math.max(
      1,
      Math.min(24, Math.floor(input.months || 1)),
    );

    const payment = await this.prisma.payment.create({
      data: {
        id: this.newId('pay'),
        tenantId,
        amount: Number(input.amount),
        currency: input.currency || 'KES',
        status: input.applyNow ? 'processing' : 'recorded',
        description: 'Manual off-system subscription payment',
        metadata: {
          source: 'manual_subscription_register',
          method: input.method || 'bank_transfer',
          referenceCode: input.referenceCode || null,
          payerName: input.payerName || null,
          receiptUrl: input.receiptUrl || null,
          receiptUploadFailed: !!input.receiptUploadFailed,
          receiptUploadError: input.receiptUploadError || null,
          notes: input.notes || null,
          months: normalizedMonths,
          applyNow: !!input.applyNow,
          appliedToSubscription: false,
          linkedSubscriptionId: latestSubscription?.id || null,
          linkedPeriodStart: latestSubscription?.currentPeriodStart || null,
          linkedPeriodEnd: latestSubscription?.currentPeriodEnd || null,
        },
        createdAt: now,
        updatedAt: now,
      },
    });

    await this.prisma.notification.create({
      data: {
        id: this.newId('notif'),
        tenantId,
        type: 'subscription_manual_payment_recorded',
        title: 'Manual subscription payment recorded',
        message: `Manual payment of ${payment.amount} ${payment.currency} was recorded${input.applyNow ? ' and queued for immediate application' : ''}.`,
        data: {
          paymentId: payment.id,
          referenceCode: input.referenceCode || null,
          method: input.method || 'bank_transfer',
          months: normalizedMonths,
        },
      },
    });

    if (input.applyNow) {
      const renewal = await this.manuallyRenewTenantSubscription(
        tenantId,
        normalizedMonths,
        input.reason || input.notes || 'Applied from manual payment register',
        input.planId,
        {
          amount: Number(input.amount),
          currency: input.currency || 'KES',
          method: input.method || 'bank_transfer',
          referenceCode: input.referenceCode,
          payerName: input.payerName,
          receiptUrl: input.receiptUrl,
          notes: input.notes,
          paymentId: payment.id,
        },
      );

      return {
        payment,
        renewal,
      };
    }

    return {
      payment,
    };
  }

  async listManualPayments(tenantId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return payments
      .filter((payment) => {
        const metadata = payment.metadata as Record<string, unknown> | null;
        return metadata?.source === 'manual_subscription_register';
      })
      .map((payment) => {
        const metadata =
          (payment.metadata as Record<string, unknown> | null) || {};
        const invoiceId =
          typeof metadata.invoiceId === 'string' ? metadata.invoiceId : null;
        return {
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          createdAt: payment.createdAt,
          completedAt: payment.completedAt,
          method: metadata.method || null,
          referenceCode: metadata.referenceCode || null,
          payerName: metadata.payerName || null,
          receiptUrl: metadata.receiptUrl || null,
          notes: metadata.notes || null,
          receiptUploadFailed: !!metadata.receiptUploadFailed,
          receiptUploadError: metadata.receiptUploadError || null,
          months: Number(metadata.months || 1),
          applyNow: !!metadata.applyNow,
          appliedToSubscription: !!metadata.appliedToSubscription,
          linkedSubscriptionId: metadata.linkedSubscriptionId || null,
          linkedPeriodStart: metadata.linkedPeriodStart || null,
          linkedPeriodEnd: metadata.linkedPeriodEnd || null,
          invoiceId,
        };
      });
  }

  async applyManualPaymentToSubscription(
    tenantId: string,
    paymentId: string,
    months?: number,
    reason?: string,
    planId?: string,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        tenantId,
      },
    });

    if (!payment) {
      throw new NotFoundException('Manual payment record not found');
    }

    const metadata = (payment.metadata as Record<string, unknown> | null) || {};
    if (metadata.source !== 'manual_subscription_register') {
      throw new BadRequestException(
        'Payment is not a manual subscription register entry',
      );
    }

    if (metadata.appliedToSubscription) {
      throw new BadRequestException(
        'This payment is already applied to a subscription',
      );
    }

    const normalizedMonths =
      months && Number.isFinite(months)
        ? Math.max(1, Math.min(24, Math.floor(months)))
        : Math.max(1, Math.min(24, Math.floor(Number(metadata.months || 1))));

    return this.manuallyRenewTenantSubscription(
      tenantId,
      normalizedMonths,
      reason ||
        (typeof metadata.notes === 'string'
          ? metadata.notes
          : 'Applied from manual payment register'),
      planId,
      {
        amount: payment.amount,
        currency: payment.currency,
        method:
          typeof metadata.method === 'string'
            ? metadata.method
            : 'bank_transfer',
        referenceCode:
          typeof metadata.referenceCode === 'string'
            ? metadata.referenceCode
            : undefined,
        payerName:
          typeof metadata.payerName === 'string'
            ? metadata.payerName
            : undefined,
        receiptUrl:
          typeof metadata.receiptUrl === 'string'
            ? metadata.receiptUrl
            : undefined,
        notes: typeof metadata.notes === 'string' ? metadata.notes : undefined,
        paymentId,
      },
    );
  }

  async getTenantSubscriptionTimeline(tenantId: string) {
    const [subscriptions, invoices, manualPayments, notifications] =
      await Promise.all([
        this.prisma.subscription.findMany({
          where: { tenantId },
          include: { Plan: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        this.prisma.invoice.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          take: 30,
        }),
        this.listManualPayments(tenantId),
        this.prisma.notification.findMany({
          where: {
            tenantId,
            type: {
              in: [
                'subscription_grace_extension',
                'subscription_manual_suspension',
                'subscription_manual_reactivation',
                'subscription_manual_renewal',
                'subscription_manual_payment_recorded',
              ],
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
      ]);

    const timeline = [
      ...subscriptions.map((sub) => ({
        id: `sub_created_${sub.id}`,
        at: sub.createdAt,
        type: 'subscription_created',
        title: `Subscription created (${sub.Plan?.name || 'Unknown plan'})`,
        details: {
          subscriptionId: sub.id,
          status: sub.status,
          periodStart: sub.currentPeriodStart,
          periodEnd: sub.currentPeriodEnd,
        },
      })),
      ...invoices.map((invoice) => ({
        id: `invoice_${invoice.id}`,
        at: invoice.createdAt,
        type: 'invoice_generated',
        title: `Invoice ${invoice.number} (${invoice.status})`,
        details: {
          invoiceId: invoice.id,
          amount: invoice.amount,
          status: invoice.status,
          paidAt: invoice.paidAt,
          dueDate: invoice.dueDate,
        },
      })),
      ...manualPayments.map((payment) => ({
        id: `manual_payment_${payment.id}`,
        at: new Date(payment.createdAt),
        type: 'manual_payment_recorded',
        title: `Manual payment ${payment.amount} ${payment.currency}`,
        details: {
          paymentId: payment.id,
          status: payment.status,
          method: payment.method,
          referenceCode: payment.referenceCode,
          payerName: payment.payerName,
          appliedToSubscription: payment.appliedToSubscription,
          invoiceId: payment.invoiceId,
        },
      })),
      ...notifications.map((notification) => ({
        id: `notif_${notification.id}`,
        at: notification.createdAt,
        type: notification.type,
        title: notification.title,
        details: {
          message: notification.message,
          data: notification.data,
          userId: notification.userId,
        },
      })),
    ];

    return timeline.sort((a, b) => b.at.getTime() - a.at.getTime());
  }

  async getBillingActionPreview(
    tenantId: string,
    action: 'grace' | 'renew' | 'suspend' | 'reactivate',
    options?: { days?: number; months?: number },
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        isSuspended: true,
        Subscription: {
          orderBy: { currentPeriodStart: 'desc' },
          take: 1,
          select: {
            id: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            status: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const subscription = tenant.Subscription?.[0] || null;
    if (!subscription && action !== 'suspend' && action !== 'reactivate') {
      throw new NotFoundException('No subscription found for tenant');
    }

    const now = new Date();
    const currentPeriodEnd = subscription?.currentPeriodEnd || null;
    const extensionDays = subscription
      ? await this.getExtraGraceDays(
          tenantId,
          subscription.currentPeriodStart,
          subscription.id,
        )
      : 0;
    const currentGraceDays =
      SubscriptionAdminService.BASE_GRACE_DAYS + extensionDays;
    const currentGraceEnd =
      currentPeriodEnd && subscription
        ? this.addDays(currentPeriodEnd, currentGraceDays)
        : null;

    let newPeriodEnd = currentPeriodEnd;
    let newGraceEnd = currentGraceEnd;
    let accessImpact = tenant.isSuspended
      ? 'Currently restricted'
      : 'Currently full access';

    if (action === 'grace' && subscription && currentPeriodEnd) {
      const days = Math.max(1, Math.min(365, Math.floor(options?.days || 1)));
      newGraceEnd = this.addDays(currentPeriodEnd, currentGraceDays + days);
      accessImpact =
        now <= newGraceEnd
          ? 'Tenant will be in grace/full access window after extension'
          : 'Tenant remains over grace and restricted if already suspended';
    }

    if (action === 'renew' && subscription) {
      const months = Math.max(
        1,
        Math.min(24, Math.floor(options?.months || 1)),
      );
      const anchorStart =
        subscription.currentPeriodEnd && subscription.currentPeriodEnd > now
          ? subscription.currentPeriodEnd
          : now;
      newPeriodEnd = this.addMonths(anchorStart, months);
      newGraceEnd = this.addDays(
        newPeriodEnd,
        SubscriptionAdminService.BASE_GRACE_DAYS,
      );
      accessImpact = 'Tenant will have full access after renewal';
    }

    if (action === 'suspend') {
      accessImpact =
        'Tenant and linked accounts will be restricted immediately';
    }

    if (action === 'reactivate') {
      accessImpact =
        'Tenant and linked accounts will regain full access immediately';
    }

    return {
      tenantId,
      action,
      currentPeriodEnd,
      newPeriodEnd,
      currentGraceEnd,
      newGraceEnd,
      currentAccess: tenant.isSuspended ? 'restricted' : 'full_access',
      projectedAccess:
        action === 'suspend'
          ? 'restricted'
          : action === 'reactivate'
            ? 'full_access'
            : accessImpact.toLowerCase().includes('full access')
              ? 'full_access'
              : tenant.isSuspended
                ? 'restricted'
                : 'full_access',
      accessImpact,
    };
  }

  async listManualInvoices(tenantId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        number: {
          startsWith: 'INV-MAN',
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const payments = await this.listManualPayments(tenantId);
    const paymentByInvoice = new Map<string, (typeof payments)[number]>();
    for (const payment of payments) {
      if (payment.invoiceId) {
        paymentByInvoice.set(payment.invoiceId, payment);
      }
    }

    return invoices.map((invoice) => {
      const linkedPayment = paymentByInvoice.get(invoice.id);
      return {
        id: invoice.id,
        number: invoice.number,
        amount: invoice.amount,
        status: invoice.status,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
        subscriptionId: invoice.subscriptionId,
        linkedPaymentId: linkedPayment?.id || null,
        linkedPaymentAmount: linkedPayment?.amount || null,
        linkedPaymentStatus: linkedPayment?.status || null,
        linkedReceiptUrl: linkedPayment?.receiptUrl || null,
        linkedReferenceCode: linkedPayment?.referenceCode || null,
      };
    });
  }

  async createManualInvoice(tenantId: string, input: CreateManualInvoiceInput) {
    if (!Number.isFinite(input.amount) || input.amount < 0) {
      throw new BadRequestException('amount must be a non-negative number');
    }

    const status = this.normalizeInvoiceStatus(input.status || 'draft');
    const now = new Date();
    const dueDate = input.dueDate ? new Date(input.dueDate) : null;
    if (input.dueDate && Number.isNaN(dueDate?.getTime())) {
      throw new BadRequestException('dueDate must be a valid ISO date');
    }

    if (input.subscriptionId) {
      const sub = await this.prisma.subscription.findFirst({
        where: { id: input.subscriptionId, tenantId },
        select: { id: true },
      });
      if (!sub) {
        throw new BadRequestException(
          'subscriptionId does not belong to tenant',
        );
      }
    }

    const invoice = await this.prisma.invoice.create({
      data: {
        id: this.newId('inv'),
        number: `INV-MAN-${Date.now()}`,
        tenantId,
        subscriptionId: input.subscriptionId || null,
        amount: Number(input.amount),
        status,
        dueDate,
        paidAt: status === 'paid' ? now : null,
        updatedAt: now,
      },
    });

    if (input.paymentId) {
      const payment = await this.prisma.payment.findFirst({
        where: { id: input.paymentId, tenantId },
        select: { id: true, metadata: true },
      });
      if (!payment) {
        throw new BadRequestException('paymentId does not belong to tenant');
      }
      const metadata =
        payment.metadata && typeof payment.metadata === 'object'
          ? (payment.metadata as Record<string, unknown>)
          : {};
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          metadata: {
            ...metadata,
            invoiceId: invoice.id,
          },
        },
      });
    }

    await this.prisma.notification.create({
      data: {
        id: this.newId('notif'),
        tenantId,
        type: 'subscription_manual_invoice_created',
        title: 'Manual invoice created',
        message: `Manual invoice ${invoice.number} created with status ${status}.`,
        data: {
          invoiceId: invoice.id,
          status,
          dueDate,
          notes: input.notes || null,
        },
      },
    });

    return invoice;
  }

  async transitionManualInvoiceStatus(
    tenantId: string,
    invoiceId: string,
    nextStatusInput: 'draft' | 'issued' | 'paid' | 'void',
    reason?: string,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      select: {
        id: true,
        number: true,
        status: true,
        paidAt: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (!invoice.number.startsWith('INV-MAN')) {
      throw new BadRequestException(
        'Only manual invoices can be transitioned here',
      );
    }

    const currentStatus = this.normalizeInvoiceStatus(invoice.status);
    const nextStatus = this.normalizeInvoiceStatus(nextStatusInput);
    if (currentStatus === nextStatus) {
      return {
        success: true,
        message: `Invoice already in ${nextStatus} state`,
      };
    }

    const allowedTransitions: Record<string, string[]> = {
      draft: ['issued', 'void'],
      issued: ['paid', 'void'],
      paid: ['void'],
      void: [],
    };

    if (!allowedTransitions[currentStatus]?.includes(nextStatus)) {
      throw new BadRequestException(
        `Invalid transition from ${currentStatus} to ${nextStatus}`,
      );
    }

    const now = new Date();
    const updated = await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: nextStatus,
        paidAt:
          nextStatus === 'paid'
            ? now
            : nextStatus === 'void'
              ? null
              : invoice.paidAt,
        updatedAt: now,
      },
    });

    if (nextStatus === 'void') {
      const payments = await this.prisma.payment.findMany({
        where: { tenantId },
        select: { id: true, status: true, metadata: true },
      });

      for (const payment of payments) {
        const metadata =
          (payment.metadata as Record<string, unknown> | null) || {};
        if (metadata.invoiceId === invoice.id) {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
              status:
                payment.status === 'completed' ? 'voided' : payment.status,
              metadata: {
                ...metadata,
                invoiceVoided: true,
                invoiceVoidedAt: now.toISOString(),
              },
            },
          });
        }
      }
    }

    await this.prisma.notification.create({
      data: {
        id: this.newId('notif'),
        tenantId,
        type: 'subscription_manual_invoice_status_changed',
        title: 'Manual invoice status updated',
        message: `Invoice ${updated.number} moved from ${currentStatus} to ${nextStatus}.`,
        data: {
          invoiceId: updated.id,
          from: currentStatus,
          to: nextStatus,
          reason: reason || null,
        },
      },
    });

    return {
      success: true,
      invoice: updated,
    };
  }

  async getReconciliationDashboard(filters: ReconciliationFilters = {}) {
    const search = (filters.search || '').trim();
    const now = new Date();

    const paymentWhere: Prisma.PaymentWhereInput = {};
    if (filters.tenantId) {
      paymentWhere.tenantId = filters.tenantId;
    }
    if (search) {
      paymentWhere.Tenant = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { contactEmail: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [payments, invoices, tenantOps] = await Promise.all([
      this.prisma.payment.findMany({
        where: paymentWhere,
        include: {
          Tenant: {
            select: {
              id: true,
              name: true,
              contactEmail: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      this.prisma.invoice.findMany({
        where: {
          ...(filters.tenantId ? { tenantId: filters.tenantId } : {}),
          ...(search
            ? {
                Tenant: {
                  OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { contactEmail: { contains: search, mode: 'insensitive' } },
                  ],
                },
              }
            : {}),
          number: {
            startsWith: 'INV-MAN',
          },
        },
        include: {
          Tenant: {
            select: {
              id: true,
              name: true,
              contactEmail: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      this.getTenantBillingOperationsOverview({
        search,
      }),
    ]);

    const manualPayments = payments
      .map((payment) => {
        const metadata =
          (payment.metadata as Record<string, unknown> | null) || {};
        return {
          id: payment.id,
          tenantId: payment.tenantId,
          tenantName: payment.Tenant?.name || 'Unknown tenant',
          tenantEmail: payment.Tenant?.contactEmail || null,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          createdAt: payment.createdAt,
          appliedToSubscription: !!metadata.appliedToSubscription,
          referenceCode:
            typeof metadata.referenceCode === 'string'
              ? metadata.referenceCode
              : null,
          receiptUrl:
            typeof metadata.receiptUrl === 'string'
              ? metadata.receiptUrl
              : null,
          receiptUploadFailed: !!metadata.receiptUploadFailed,
          receiptUploadError:
            typeof metadata.receiptUploadError === 'string'
              ? metadata.receiptUploadError
              : null,
          source: metadata.source,
          invoiceId:
            typeof metadata.invoiceId === 'string' ? metadata.invoiceId : null,
        };
      })
      .filter((payment) => payment.source === 'manual_subscription_register');

    const unappliedManualPayments = manualPayments.filter(
      (payment) =>
        !payment.appliedToSubscription &&
        payment.status !== 'void' &&
        payment.status !== 'voided' &&
        payment.status !== 'refunded',
    );

    const failedReceiptUploads = manualPayments.filter(
      (payment) => payment.receiptUploadFailed,
    );

    const paymentByInvoiceId = new Map<string, typeof manualPayments>();
    for (const payment of manualPayments) {
      if (!payment.invoiceId) continue;
      if (!paymentByInvoiceId.has(payment.invoiceId)) {
        paymentByInvoiceId.set(payment.invoiceId, []);
      }
      paymentByInvoiceId.get(payment.invoiceId)!.push(payment);
    }

    const invoicePaymentMismatches = invoices
      .map((invoice) => {
        const linkedPayments = paymentByInvoiceId.get(invoice.id) || [];
        const paidAmount = linkedPayments.reduce((sum, p) => sum + p.amount, 0);

        let issue: string | null = null;
        if (invoice.status === 'paid' && linkedPayments.length === 0) {
          issue = 'Paid invoice has no linked manual payment';
        } else if (
          linkedPayments.length > 0 &&
          Math.abs(Number(invoice.amount) - Number(paidAmount)) > 0.01
        ) {
          issue = 'Invoice amount does not match linked payment total';
        } else if (
          invoice.status === 'void' &&
          linkedPayments.some((p) => p.status === 'completed')
        ) {
          issue = 'Invoice is void but linked payment is still completed';
        }

        if (!issue) {
          return null;
        }

        return {
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          tenantId: invoice.tenantId,
          tenantName: invoice.Tenant?.name || 'Unknown tenant',
          tenantEmail: invoice.Tenant?.contactEmail || null,
          invoiceStatus: invoice.status,
          invoiceAmount: invoice.amount,
          linkedPaymentCount: linkedPayments.length,
          linkedPaymentAmount: paidAmount,
          issue,
          createdAt: invoice.createdAt,
        };
      })
      .filter((row): row is NonNullable<typeof row> => !!row);

    const overdueTenants = tenantOps
      .filter((tenant) => tenant.billingState === 'expired_over_grace')
      .map((tenant) => ({
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        tenantEmail: tenant.tenantEmail,
        billingState: tenant.billingState,
        currentPeriodEnd: tenant.currentPeriodEnd,
        graceEndsAt: tenant.graceEndsAt,
        daysSinceExpiry: tenant.daysSinceExpiry,
        isSuspended: tenant.isSuspended,
      }));

    const filteredMismatches = filters.mismatchOnly
      ? invoicePaymentMismatches
      : invoicePaymentMismatches;
    const filteredOverdue = filters.overdueOnly
      ? overdueTenants
      : overdueTenants;

    return {
      generatedAt: now,
      summary: {
        unappliedManualPayments: unappliedManualPayments.length,
        failedReceiptUploads: failedReceiptUploads.length,
        invoicePaymentMismatches: filteredMismatches.length,
        overdueTenants: filteredOverdue.length,
      },
      unappliedManualPayments,
      failedReceiptUploads,
      invoicePaymentMismatches: filteredMismatches,
      overdueTenants: filteredOverdue,
    };
  }

  async exportReconciliationRows(filters: ReconciliationFilters = {}) {
    const report = await this.getReconciliationDashboard(filters);
    const rows: Array<Record<string, string | number | null>> = [];

    for (const payment of report.unappliedManualPayments) {
      rows.push({
        category: 'unapplied_manual_payment',
        tenantId: payment.tenantId,
        tenantName: payment.tenantName,
        tenantEmail: payment.tenantEmail,
        recordId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        reference: payment.referenceCode,
        issue: 'Manual payment not yet applied to subscription',
        createdAt: payment.createdAt.toISOString(),
      });
    }

    for (const payment of report.failedReceiptUploads) {
      rows.push({
        category: 'failed_receipt_upload',
        tenantId: payment.tenantId,
        tenantName: payment.tenantName,
        tenantEmail: payment.tenantEmail,
        recordId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        reference: payment.referenceCode,
        issue: payment.receiptUploadError || 'Receipt upload failed',
        createdAt: payment.createdAt.toISOString(),
      });
    }

    for (const mismatch of report.invoicePaymentMismatches) {
      rows.push({
        category: 'invoice_payment_mismatch',
        tenantId: mismatch.tenantId,
        tenantName: mismatch.tenantName,
        tenantEmail: mismatch.tenantEmail,
        recordId: mismatch.invoiceId,
        amount: mismatch.invoiceAmount,
        currency: 'KES',
        status: mismatch.invoiceStatus,
        reference: mismatch.invoiceNumber,
        issue: mismatch.issue,
        createdAt: mismatch.createdAt.toISOString(),
      });
    }

    for (const tenant of report.overdueTenants) {
      rows.push({
        category: 'overdue_tenant',
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        tenantEmail: tenant.tenantEmail,
        recordId: tenant.tenantId,
        amount: null,
        currency: null,
        status: tenant.billingState,
        reference: tenant.currentPeriodEnd
          ? new Date(tenant.currentPeriodEnd).toISOString()
          : null,
        issue: `Over grace by ${tenant.daysSinceExpiry} day(s)`,
        createdAt: new Date(report.generatedAt).toISOString(),
      });
    }

    return rows;
  }

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
    const [
      userCount,
      activeVariationCount,
      nonVariationProductCount,
      salesCount,
    ] = await Promise.all([
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.productVariation.count({
        where: {
          tenantId,
          isActive: true,
          deletedAt: null,
        },
      }),
      this.prisma.product.count({
        where: {
          tenantId,
          deletedAt: null,
          variations: {
            none: {
              isActive: true,
              deletedAt: null,
            },
          },
        },
      }),
      this.prisma.sale.count({ where: { tenantId } }),
    ]);

    const productCount = activeVariationCount + nonVariationProductCount;

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

  private async getExtraGraceDays(
    tenantId: string,
    periodStart: Date,
    subscriptionId: string,
  ): Promise<number> {
    const extensions = await this.prisma.notification.findMany({
      where: {
        tenantId,
        type: 'subscription_grace_extension',
        createdAt: {
          gte: periodStart,
        },
      },
      select: {
        data: true,
      },
    });

    return extensions.reduce((sum, extension) => {
      const data = extension.data as {
        days?: number;
        subscriptionId?: string;
      } | null;
      if (!data) {
        return sum;
      }
      if (data.subscriptionId && data.subscriptionId !== subscriptionId) {
        return sum;
      }
      const days = Number(data.days || 0);
      if (!Number.isFinite(days) || days <= 0) {
        return sum;
      }
      return sum + Math.floor(days);
    }, 0);
  }

  private addDays(date: Date, days: number): Date {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  private addMonths(date: Date, months: number): Date {
    const copy = new Date(date);
    copy.setMonth(copy.getMonth() + months);
    return copy;
  }

  private newId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private normalizeInvoiceStatus(
    status: string,
  ): 'draft' | 'issued' | 'paid' | 'void' {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'draft') return 'draft';
    if (normalized === 'issued') return 'issued';
    if (normalized === 'paid') return 'paid';
    if (normalized === 'void') return 'void';
    throw new BadRequestException(
      'Invoice status must be one of: draft, issued, paid, void',
    );
  }
}
