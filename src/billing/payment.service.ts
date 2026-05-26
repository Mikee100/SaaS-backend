import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma.service';
import { StripeService } from './stripe.service';
import { AuditLogService } from '../audit-log.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Process a one-time payment
   */
  async processOneTimePayment(
    tenantId: string,
    amount: number,
    currency: string,
    description: string,
    metadata: Record<string, any> = {},
  ) {
    try {
      this.logger.log(
        `Processing one-time payment for tenant: ${tenantId}, amount: ${amount}`,
      );

      const paymentIntent = await this.stripeService.createOneTimePaymentIntent(
        tenantId,
        amount,
        currency,
        description,
        metadata,
      );

      const payment = await this.prisma.payment.create({
        data: {
          id: randomUUID(),
          tenantId,
          stripePaymentIntentId: paymentIntent.id,
          amount,
          currency: currency.toUpperCase(),
          status: paymentIntent.status,
          description,
          metadata,
          completedAt:
            paymentIntent.status === 'succeeded' ? new Date() : undefined,
          updatedAt: new Date(),
        },
      });

      await this.auditLogService.log(null, 'payment_created', {
        tenantId,
        paymentId: payment.id,
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
      });

      return {
        paymentId: payment.id,
        clientSecret: paymentIntent.client_secret,
        amount,
        currency,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process one-time payment for tenant: ${tenantId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Confirm a payment
   */
  async confirmPayment(paymentId: string, paymentIntentId: string) {
    try {
      this.logger.log(`Confirming payment: ${paymentId}`);

      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.stripePaymentIntentId !== paymentIntentId) {
        throw new Error('Payment intent does not match payment record');
      }

      const paymentIntent = await this.stripeService.retrievePaymentIntent(
        payment.tenantId,
        paymentIntentId,
      );

      const isSucceeded = paymentIntent.status === 'succeeded';

      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: paymentIntent.status,
          completedAt: isSucceeded ? new Date() : null,
          updatedAt: new Date(),
        },
      });

      await this.auditLogService.log(null, 'payment_confirmed', {
        paymentId,
        paymentIntentId,
        status: paymentIntent.status,
      });

      return { success: isSucceeded, paymentId };
    } catch (error) {
      this.logger.error(`Failed to confirm payment: ${paymentId}`, error);
      throw error;
    }
  }

  /**
   * Generate invoice for a subscription
   */
  async generateInvoice(
    subscriptionId: string,
    amount: number,
    currency: string = 'usd',
  ) {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { Plan: true, Tenant: true },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Create invoice in Stripe
      const stripeInvoice = await this.stripeService.createInvoice(
        subscription.tenantId,
        subscription.stripeSubscriptionId,
        amount,
        currency,
      );

      // Store invoice record
      const invoice = await this.prisma.invoice.create({
        data: {
          id: stripeInvoice.id,
          tenantId: subscription.tenantId,
          subscriptionId: subscription.id,
          number: stripeInvoice.number || `INV-${Date.now()}`,
          amount,
          status: stripeInvoice.status || 'open',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          updatedAt: new Date(),
        },
      });

      await this.auditLogService.log(null, 'invoice_generated', {
        tenantId: subscription.tenantId,
        invoiceId: invoice.id,
        amount,
        subscriptionId: subscription.id,
      });

      return invoice;
    } catch (error) {
      this.logger.error(
        `Failed to generate invoice for subscription: ${subscriptionId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(
    tenantId: string,
    period: 'month' | 'quarter' | 'year' = 'month',
  ) {
    try {
      this.logger.log(
        `Getting payment analytics for tenant: ${tenantId}, period: ${period}`,
      );

      const now = new Date();
      const startDate = new Date(now);
      if (period === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (period === 'quarter') {
        startDate.setMonth(now.getMonth() - 3);
      } else {
        startDate.setFullYear(now.getFullYear() - 1);
      }

      const [aggregate, statusBreakdown] = await Promise.all([
        this.prisma.payment.aggregate({
          where: {
            tenantId,
            createdAt: { gte: startDate },
            status: { in: ['succeeded', 'completed'] },
          },
          _sum: { amount: true },
          _count: { id: true },
        }),
        this.prisma.payment.groupBy({
          by: ['status'],
          where: {
            tenantId,
            createdAt: { gte: startDate },
          },
          _count: { status: true },
          _sum: { amount: true },
        }),
      ]);

      const totalRevenue = aggregate._sum.amount || 0;
      const paymentCount = aggregate._count.id || 0;

      const analytics = {
        period,
        totalRevenue,
        paymentCount,
        averagePayment: paymentCount > 0 ? totalRevenue / paymentCount : 0,
        statusBreakdown,
        currency: 'USD',
      };

      await this.auditLogService.log(null, 'payment_analytics_viewed', {
        tenantId,
        period,
      });

      return analytics;
    } catch (error) {
      this.logger.error(
        `Failed to get payment analytics for tenant: ${tenantId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(
    tenantId: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    try {
      this.logger.log(
        `Getting payment history for tenant: ${tenantId}, limit: ${limit}, offset: ${offset}`,
      );

      const [payments, invoices] = await Promise.all([
        this.prisma.payment.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        this.prisma.invoice.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          take: Math.max(10, Math.ceil(limit / 2)),
        }),
      ]);

      const paymentHistory = payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        description: payment.description || 'One-time payment',
        createdAt: payment.createdAt.toISOString(),
        type: 'payment',
      }));

      const invoiceHistory = invoices.map((invoice) => ({
        id: invoice.id,
        amount: invoice.amount,
        currency: 'USD',
        status: invoice.status,
        description: `Invoice ${invoice.number}`,
        createdAt: invoice.createdAt.toISOString(),
        type: 'invoice',
      }));

      const history = [...paymentHistory, ...invoiceHistory]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, limit);

      await this.auditLogService.log(null, 'payment_history_viewed', {
        tenantId,
        limit,
        offset,
      });

      return history;
    } catch (error) {
      this.logger.error(
        `Failed to get payment history for tenant: ${tenantId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId: string, amount?: number, reason?: string) {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'completed') {
        throw new Error('Payment must be completed to refund');
      }

      // Process refund in Stripe
      const refund = await this.stripeService.createRefund(
        payment.tenantId,
        payment.stripePaymentIntentId!,
        amount || payment.amount,
        reason,
      );

      // Update payment status
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'refunded',
          refundedAt: new Date(),
          refundAmount: amount || payment.amount,
          refundReason: reason,
        },
      });

      await this.auditLogService.log(null, 'payment_refunded', {
        tenantId: payment.tenantId,
        paymentId: payment.id,
        refundAmount: amount || payment.amount,
        reason,
      });

      return { success: true, refundId: refund.id };
    } catch (error) {
      this.logger.error(`Failed to refund payment: ${paymentId}`, error);
      throw error;
    }
  }

  /**
   * Get payment methods for a tenant
   */
  async getPaymentMethods(tenantId: string) {
    try {
      this.logger.log(`Getting payment methods for tenant: ${tenantId}`);

      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { stripeCustomerId: true },
      });

      if (!tenant?.stripeCustomerId) {
        return [];
      }

      const methods = await this.stripeService.getPaymentMethods(
        tenantId,
        tenant.stripeCustomerId,
      );

      const normalizedMethods = methods.map((method) => ({
        id: method.id,
        type: method.type,
        card: method.card
          ? {
              brand: method.card.brand,
              last4: method.card.last4,
              expMonth: method.card.exp_month,
              expYear: method.card.exp_year,
            }
          : null,
      }));

      await this.auditLogService.log(null, 'payment_methods_viewed', {
        tenantId,
      });

      return normalizedMethods;
    } catch (error) {
      this.logger.error(
        `Failed to get payment methods for tenant: ${tenantId}`,
        error,
      );
      return [];
    }
  }

  /**
   * Add a payment method
   */
  async addPaymentMethod(tenantId: string, paymentMethodId: string) {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { stripeCustomerId: true, contactEmail: true, name: true },
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      let stripeCustomerId = tenant.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await this.stripeService.createCustomer(
          tenantId,
          tenant.contactEmail || '',
          tenant.name || '',
        );
        await this.prisma.tenant.update({
          where: { id: tenantId },
          data: { stripeCustomerId: customer.id },
        });
        stripeCustomerId = customer.id;
      }

      if (!stripeCustomerId) {
        throw new Error('Stripe customer ID is missing');
      }

      await this.stripeService.attachPaymentMethod(
        tenantId,
        stripeCustomerId,
        paymentMethodId,
      );

      await this.auditLogService.log(null, 'payment_method_added', {
        tenantId,
        paymentMethodId,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to add payment method for tenant: ${tenantId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Remove a payment method
   */
  async removePaymentMethod(tenantId: string, paymentMethodId: string) {
    try {
      await this.stripeService.detachPaymentMethod(tenantId, paymentMethodId);

      await this.auditLogService.log(null, 'payment_method_removed', {
        tenantId,
        paymentMethodId,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to remove payment method for tenant: ${tenantId}`,
        error,
      );
      throw error;
    }
  }
}
