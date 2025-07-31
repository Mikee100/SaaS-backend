import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';
import { TenantConfigurationService } from '../config/tenant-configuration.service';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly tenantConfigurationService: TenantConfigurationService,
  ) {
    // Initialize with global Stripe key for backward compatibility
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-07-30.basil',
        typescript: true,
      });
    } else {
      this.stripe = null;
      this.logger.warn('Global Stripe secret key not found. Stripe features will be disabled.');
    }
  }

  private async getStripeForTenant(tenantId: string): Promise<Stripe | null> {
    try {
      const secretKey = await this.tenantConfigurationService.getStripeSecretKey(tenantId);
      if (!secretKey) {
        return null;
      }
      
      return new Stripe(secretKey, {
        apiVersion: '2025-07-30.basil',
        typescript: true,
      });
    } catch (error) {
      this.logger.error(`Failed to get Stripe instance for tenant: ${tenantId}`, error);
      return null;
    }
  }

  /**
   * Create a customer in Stripe
   */
  async createCustomer(tenantId: string, email: string, name: string): Promise<Stripe.Customer> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }
    
    try {
      this.logger.log(`Creating Stripe customer for tenant: ${tenantId}, email: ${email}`);

      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          tenantId,
        },
      });

      // Update tenant with Stripe customer ID
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { stripeCustomerId: customer.id },
      });

      await this.auditLogService.log('system', 'stripe_customer_created', {
        tenantId,
        customerId: customer.id,
        email,
      });

      this.logger.log(`Successfully created Stripe customer: ${customer.id} for tenant: ${tenantId}`);
      return customer;
    } catch (error) {
      this.logger.error(`Failed to create Stripe customer for tenant: ${tenantId}`, error);
      throw new InternalServerErrorException('Failed to create customer');
    }
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(
    tenantId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    userId: string,
  ): Promise<Stripe.Checkout.Session> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }
    
    try {
      this.logger.log(`Creating checkout session for tenant: ${tenantId}, price: ${priceId}`);

      // Get tenant and customer info
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { stripeCustomerId: true, name: true },
      });

      if (!tenant) {
        throw new BadRequestException('Tenant not found');
      }

      // Create customer if doesn't exist
      let customerId = tenant.stripeCustomerId;
      if (!customerId) {
        const customer = await this.createCustomer(tenantId, 'admin@example.com', tenant.name);
        customerId = customer.id;
      }

      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          tenantId,
          userId,
        },
        subscription_data: {
          metadata: {
            tenantId,
          },
        },
      });

      await this.auditLogService.log(userId, 'stripe_checkout_created', {
        tenantId,
        sessionId: session.id,
        priceId,
      });

      this.logger.log(`Successfully created checkout session: ${session.id} for tenant: ${tenantId}`);
      return session;
    } catch (error) {
      this.logger.error(`Failed to create checkout session for tenant: ${tenantId}`, error);
      throw new InternalServerErrorException('Failed to create checkout session');
    }
  }

  /**
   * Create a billing portal session
   */
  async createBillingPortalSession(
    tenantId: string,
    returnUrl: string,
    userId: string,
  ): Promise<Stripe.BillingPortal.Session> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }
    
    try {
      this.logger.log(`Creating billing portal session for tenant: ${tenantId}`);

      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { stripeCustomerId: true },
      });

      if (!tenant?.stripeCustomerId) {
        throw new BadRequestException('No Stripe customer found for tenant');
      }

      const session = await this.stripe.billingPortal.sessions.create({
        customer: tenant.stripeCustomerId,
        return_url: returnUrl,
      });

      await this.auditLogService.log(userId, 'stripe_portal_accessed', {
        tenantId,
        sessionId: session.id,
      });

      this.logger.log(`Successfully created billing portal session: ${session.id} for tenant: ${tenantId}`);
      return session;
    } catch (error) {
      this.logger.error(`Failed to create billing portal session for tenant: ${tenantId}`, error);
      throw new InternalServerErrorException('Failed to create billing portal session');
    }
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(event: Stripe.Event, userId?: string): Promise<void> {
    if (!this.stripe) {
      this.logger.warn('Stripe is not configured, ignoring webhook');
      return;
    }
    
    try {
      this.logger.log(`Processing Stripe webhook: ${event.type} for event: ${event.id}`);

      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription, userId);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription, userId);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription, userId);
          break;
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice, userId);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice, userId);
          break;
        default:
          this.logger.log(`Unhandled webhook event type: ${event.type}`);
      }

      await this.auditLogService.log(userId || 'system', 'stripe_webhook_processed', {
        eventType: event.type,
        eventId: event.id,
      });

      this.logger.log(`Successfully processed webhook: ${event.type} for event: ${event.id}`);
    } catch (error) {
      this.logger.error(`Failed to process webhook: ${event.type}`, error);
      throw error;
    }
  }

  /**
   * Handle subscription created
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription, userId?: string): Promise<void> {
    const tenantId = subscription.metadata.tenantId;
    if (!tenantId) {
      this.logger.error('No tenantId in subscription metadata');
      return;
    }

    try {
      // Get the plan based on the price ID
      const priceId = subscription.items.data[0].price.id;
      let planId = 'basic-plan'; // Default to basic plan
      
      // Map Stripe price IDs to plan IDs
      if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
        planId = 'pro-plan';
      } else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
        planId = 'enterprise-plan';
      }

      await this.prisma.subscription.create({
        data: {
          id: subscription.id,
          tenantId,
          planId,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          status: subscription.status,
          currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      });

      await this.auditLogService.log(userId || 'system', 'subscription_created', {
        tenantId,
        subscriptionId: subscription.id,
        status: subscription.status,
      });

      this.logger.log(`Subscription created: ${subscription.id} for tenant: ${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to handle subscription created: ${subscription.id}`, error);
    }
  }

  /**
   * Handle subscription updated
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription, userId?: string): Promise<void> {
    const tenantId = subscription.metadata.tenantId;
    if (!tenantId) {
      this.logger.error('No tenantId in subscription metadata');
      return;
    }

    try {
      await this.prisma.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: subscription.status,
          currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      });

      await this.auditLogService.log(userId || 'system', 'subscription_updated', {
        tenantId,
        subscriptionId: subscription.id,
        status: subscription.status,
      });

      this.logger.log(`Subscription updated: ${subscription.id} for tenant: ${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to handle subscription updated: ${subscription.id}`, error);
    }
  }

  /**
   * Handle subscription deleted
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription, userId?: string): Promise<void> {
    const tenantId = subscription.metadata.tenantId;
    if (!tenantId) {
      this.logger.error('No tenantId in subscription metadata');
      return;
    }

    try {
      await this.prisma.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: 'canceled',
          canceledAt: new Date(),
        },
      });

      await this.auditLogService.log(userId || 'system', 'subscription_canceled', {
        tenantId,
        subscriptionId: subscription.id,
      });

      this.logger.log(`Subscription canceled: ${subscription.id} for tenant: ${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to handle subscription deleted: ${subscription.id}`, error);
    }
  }

  /**
   * Handle payment succeeded
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice, userId?: string): Promise<void> {
    if (!this.stripe) {
      this.logger.warn('Stripe is not configured, ignoring payment succeeded');
      return;
    }
    
    try {
      // Get tenant ID from customer metadata or find by customer ID
      let tenantId = '';
      if (invoice.customer) {
        const customer = await this.stripe.customers.retrieve(invoice.customer as string);
        tenantId = (customer as any).metadata?.tenantId || '';
      }

      if (!tenantId) {
        this.logger.error('No tenantId found for invoice:', invoice.id);
        return;
      }

      await this.prisma.invoice.create({
        data: {
          id: invoice.id,
          tenantId,
          stripeInvoiceId: invoice.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: invoice.status || 'paid',
          dueDate: new Date((invoice as any).due_date * 1000),
          paidAt: new Date(),
        },
      });

      await this.auditLogService.log(userId || 'system', 'payment_succeeded', {
        invoiceId: invoice.id,
        amount: invoice.amount_paid,
      });

      this.logger.log(`Payment succeeded: ${invoice.id}`);
    } catch (error) {
      this.logger.error(`Failed to handle payment succeeded: ${invoice.id}`, error);
    }
  }

  /**
   * Handle payment failed
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice, userId?: string): Promise<void> {
    try {
      await this.auditLogService.log(userId || 'system', 'payment_failed', {
        invoiceId: invoice.id,
        amount: invoice.amount_due,
      });

      this.logger.log(`Payment failed: ${invoice.id}`);
    } catch (error) {
      this.logger.error(`Failed to handle payment failed: ${invoice.id}`, error);
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(tenantId: string, userId: string): Promise<void> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }
    
    try {
      this.logger.log(`Canceling subscription for tenant: ${tenantId}`);

      const subscription = await this.prisma.subscription.findFirst({
        where: { tenantId },
      });

      if (!subscription?.stripeSubscriptionId) {
        throw new BadRequestException('No active subscription found');
      }

      await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await this.auditLogService.log(userId, 'subscription_cancel_requested', {
        tenantId,
        subscriptionId: subscription.stripeSubscriptionId,
      });

      this.logger.log(`Subscription cancel requested: ${subscription.stripeSubscriptionId} for tenant: ${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to cancel subscription for tenant: ${tenantId}`, error);
      throw new InternalServerErrorException('Failed to cancel subscription');
    }
  }

  /**
   * Get subscription details
   */
  async getSubscriptionDetails(tenantId: string): Promise<Stripe.Subscription | null> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }
    
    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: { tenantId },
      });

      if (!subscription?.stripeSubscriptionId) {
        return null;
      }

      return await this.stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
    } catch (error) {
      this.logger.error(`Failed to get subscription details for tenant: ${tenantId}`, error);
      return null;
    }
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhookSignature(payload: Buffer, signature: string, secret: string): Promise<Stripe.Event> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }
    
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }
} 