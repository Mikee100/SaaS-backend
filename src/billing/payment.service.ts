import { Injectable, Logger } from '@nestjs/common';
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
      this.logger.log(`Processing one-time payment for tenant: ${tenantId}, amount: ${amount}`);

      // Mock implementation for now - replace with actual Stripe integration once configured
      const mockPaymentId = `pi_${Date.now()}`;
      const mockClientSecret = `pi_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`;

  await this.auditLogService.log(null, 'payment_created', {
        tenantId,
        paymentId: mockPaymentId,
        amount,
        currency,
      });

      return {
        paymentId: mockPaymentId,
        clientSecret: mockClientSecret,
        amount,
        currency,
      };
    } catch (error) {
      this.logger.error(`Failed to process one-time payment for tenant: ${tenantId}`, error);
      throw error;
    }
  }

  /**
   * Confirm a payment
   */
  async confirmPayment(paymentId: string, paymentIntentId: string) {
    try {
      this.logger.log(`Confirming payment: ${paymentId}`);

      // Mock implementation for now - replace with actual database update once Payment model is migrated
  await this.auditLogService.log(null, 'payment_confirmed', {
        paymentId,
        paymentIntentId,
      });

      return { success: true, paymentId };
    } catch (error) {
      this.logger.error(`Failed to confirm payment: ${paymentId}`, error);
      throw error;
    }
  }

  /**
   * Generate invoice for a subscription
   */
  async generateInvoice(subscriptionId: string, amount: number, currency: string = 'usd') {
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
        subscription.stripeSubscriptionId!,
        amount,
        currency,
      );

      // Store invoice record
      const invoice = await this.prisma.invoice.create({
        data: {
          id: `inv_${Date.now()}`,
          tenantId: subscription.tenantId,
          subscriptionId: subscription.id,
          number: stripeInvoice.number || `INV-${Date.now()}`,
          amount: amount / 100, // Convert from cents to dollars if needed
          status: 'draft',
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
      this.logger.error(`Failed to generate invoice for subscription: ${subscriptionId}`, error);
      throw error;
    }
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(tenantId: string, period: 'month' | 'quarter' | 'year' = 'month') {
    try {
      this.logger.log(`Getting payment analytics for tenant: ${tenantId}, period: ${period}`);

      // Mock data for now - replace with actual database queries once Payment model is migrated
      const mockAnalytics = {
        period,
        totalRevenue: 1250.00,
        paymentCount: 15,
        averagePayment: 83.33,
        paymentMethods: [
          {
            paymentMethod: 'card',
            _count: { paymentMethod: 12 },
            _sum: { amount: 1000.00 }
          },
          {
            paymentMethod: 'bank_transfer',
            _count: { paymentMethod: 3 },
            _sum: { amount: 250.00 }
          }
        ],
        currency: 'USD'
      };

  await this.auditLogService.log(null, 'payment_analytics_viewed', {
        tenantId,
        period,
      });

      return mockAnalytics;
    } catch (error) {
      this.logger.error(`Failed to get payment analytics for tenant: ${tenantId}`, error);
      throw error;
    }
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(tenantId: string, limit: number = 50, offset: number = 0) {
    try {
      this.logger.log(`Getting payment history for tenant: ${tenantId}, limit: ${limit}, offset: ${offset}`);

      // Mock data for now - replace with actual database queries once Payment model is migrated
      const mockHistory = [
        {
          id: '1',
          amount: 99.99,
          currency: 'USD',
          status: 'completed',
          description: 'Monthly subscription payment',
          createdAt: new Date().toISOString(),
          type: 'payment'
        },
        {
          id: '2',
          amount: 29.99,
          currency: 'USD',
          status: 'completed',
          description: 'One-time payment',
          createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          type: 'payment'
        },
        {
          id: '3',
          amount: 199.99,
          currency: 'USD',
          status: 'pending',
          description: 'Annual subscription',
          createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          type: 'invoice'
        }
      ];

  await this.auditLogService.log(null, 'payment_history_viewed', {
        tenantId,
        limit,
        offset,
      });

      return mockHistory;
    } catch (error) {
      this.logger.error(`Failed to get payment history for tenant: ${tenantId}`, error);
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

      // Mock data for now - replace with actual Stripe calls once configured
      const mockMethods = [
        {
          id: 'pm_1',
          type: 'card',
          card: {
            brand: 'visa',
            last4: '4242',
            expMonth: 12,
            expYear: 2025
          }
        },
        {
          id: 'pm_2',
          type: 'card',
          card: {
            brand: 'mastercard',
            last4: '5555',
            expMonth: 6,
            expYear: 2026
          }
        }
      ];

  await this.auditLogService.log(null, 'payment_methods_viewed', {
        tenantId,
      });

      return mockMethods;
    } catch (error) {
      this.logger.error(`Failed to get payment methods for tenant: ${tenantId}`, error);
      return [];
    }
  }

  /**
   * Add a payment method
   */
  async addPaymentMethod(tenantId: string, paymentMethodId: string) {
    try {
      let tenant = await this.prisma.tenant.findUnique({
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
          tenant.name || ''
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

      await this.stripeService.attachPaymentMethod(tenantId, stripeCustomerId, paymentMethodId);

  await this.auditLogService.log(null, 'payment_method_added', {
        tenantId,
        paymentMethodId,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to add payment method for tenant: ${tenantId}`, error);
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
      this.logger.error(`Failed to remove payment method for tenant: ${tenantId}`, error);
      throw error;
    }
  }
} 