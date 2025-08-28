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
      // First try to get tenant-specific Stripe key
      const secretKey = await this.tenantConfigurationService.getStripeSecretKey(tenantId);
      if (secretKey) {
        return new Stripe(secretKey, {
          apiVersion: '2025-07-30.basil',
          typescript: true,
        });
      }
      
      // Fall back to global Stripe key
      if (this.stripe) {
        return this.stripe;
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Failed to get Stripe instance for tenant: ${tenantId}`, error);
      return null;
    }
  }

  /**
   * Create a customer in Stripe
   */
  async createCustomer(tenantId: string, email: string, name: string): Promise<Stripe.Customer> {
    const stripe = await this.getStripeForTenant(tenantId);
    if (!stripe) {
      throw new Error('Stripe is not configured for this tenant');
    }
    
    try {
      this.logger.log(`Creating Stripe customer for tenant: ${tenantId}, email: ${email}`);

      const customer = await stripe.customers.create({
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
    customerEmail?: string
  ): Promise<Stripe.Checkout.Session> {
    const stripe = await this.getStripeForTenant(tenantId);
    if (!stripe) {
      throw new Error('Stripe is not configured for this tenant');
    }

    // Get the tenant's subscription to determine if this is an upgrade/downgrade
      const subscription = await this.prisma.subscription.findFirst({
        where: { tenantId },
        orderBy: { id: 'desc' },
      });

    // Create or retrieve customer
    let customer: Stripe.Customer | null = null;
    if (subscription?.stripeCustomerId) {
      try {
        const customerData = await stripe.customers.retrieve(subscription.stripeCustomerId);
        if (!customerData.deleted) {
          customer = customerData as Stripe.Customer;
        }
      } catch (error) {
        this.logger.error(`Failed to retrieve customer: ${error.message}`);
      }
    }

    if (!customer) {
      customer = await stripe.customers.create({
        email: customerEmail,
        metadata: { tenantId, userId },
      });
    }

    // Create checkout session
    return stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer: customer.id,
      client_reference_id: tenantId,
      subscription_data: {
        metadata: { tenantId, userId },
      },
    });
  }

  /**
   * Create a billing portal session
   */
  async createBillingPortalSession(
    tenantId: string,
    returnUrl: string,
    userId: string,
  ): Promise<Stripe.BillingPortal.Session> {
    const stripe = await this.getStripeForTenant(tenantId);
    if (!stripe) {
      throw new Error('Stripe is not configured for this tenant');
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

      const session = await stripe.billingPortal.sessions.create({
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
          stripeCustomerId: subscription.customer as string,
          stripePriceId: priceId,
          stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          status: subscription.status,
          currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          canceledAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
          trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
          trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
          userId: userId || 'system', // Use system as fallback if userId is not provided
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
          canceledAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
          trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
          trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
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

  // const subscriptionId = typeof invoice.subscription === 'string'
  //   ? invoice.subscription
  //   : invoice.subscription?.id || null;

      await this.prisma.invoice.create({
        data: {
          id: invoice.id,
          number: invoice.number || `INV-${Date.now()}`,
          tenantId,
          amount: (invoice.amount_paid || 0) / 100, // Convert from cents to dollars
          status: invoice.status === 'paid' ? 'paid' : 'open',
          dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
          paidAt: invoice.status === 'paid' ? new Date() : null,
          // subscriptionId,
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
    const stripe = await this.getStripeForTenant(tenantId);
    if (!stripe) {
      throw new Error('Stripe is not configured for this tenant');
    }
    
    try {
      this.logger.log(`Canceling subscription for tenant: ${tenantId}`);

      const subscription = await this.prisma.subscription.findFirst({
        where: { 
          tenantId,
          status: { in: ['active', 'past_due', 'trialing'] }
        },
      });

      if (!subscription) {
        throw new BadRequestException('No active subscription found for this tenant');
      }

      if (!subscription.stripeSubscriptionId) {
        // If there's a subscription without a Stripe ID, we can't cancel it through Stripe
        // Update the local subscription to mark it as canceled
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { 
            status: 'canceled',
            cancelAtPeriodEnd: true,
            canceledAt: new Date()
          }
        });

        await this.auditLogService.log(userId, 'subscription_canceled_locally', {
          tenantId,
          subscriptionId: subscription.id,
          reason: 'No Stripe subscription ID associated'
        });

        this.logger.log(`Subscription canceled locally (no Stripe ID): ${subscription.id} for tenant: ${tenantId}`);
        return; // Exit successfully since we've handled the cancellation locally
      }

      // Check if already canceled
      if (subscription.cancelAtPeriodEnd) {
        throw new BadRequestException('Subscription is already scheduled for cancellation');
      }

      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      // Update local subscription record
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { cancelAtPeriodEnd: true }
      });

      await this.auditLogService.log(userId, 'subscription_cancel_requested', {
        tenantId,
        subscriptionId: subscription.stripeSubscriptionId,
      });

      this.logger.log(`Subscription cancel requested: ${subscription.stripeSubscriptionId} for tenant: ${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to cancel subscription for tenant: ${tenantId}`, error);
      
      // Re-throw BadRequestException as-is
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Failed to cancel subscription');
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(tenantId: string): Promise<{ id: string; status: string; stripeSubscriptionId: string; stripeCustomerId: string } | null> {
    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: { tenantId },
        orderBy: { id: 'desc' }, 
        include: {
          tenant: true,
          user: true,
        },
      });

      if (!subscription || !subscription.stripeSubscriptionId) {
        return null;
      }

      return {
        id: subscription.id,
        status: subscription.status,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        stripeCustomerId: subscription.stripeCustomerId,
      };
    } catch (error) {
      this.logger.error('Error getting subscription:', error);
      throw error;
    }
  }

  /**
   * Clean up orphaned subscriptions that don't have Stripe IDs
   */
  async cleanupOrphanedSubscriptions(tenantId: string): Promise<void> {
    try {
      const orphanedSubscriptions = await this.prisma.subscription.findMany({
        where: {
          tenantId,
          // stripeSubscriptionId: null,
          status: { in: ['active', 'past_due', 'trialing'] }
        }
      });

      for (const subscription of orphanedSubscriptions) {
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { 
            status: 'canceled',
            cancelAtPeriodEnd: true,
            canceledAt: new Date()
          }
        });

        this.logger.log(`Cleaned up orphaned subscription: ${subscription.id} for tenant: ${tenantId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup orphaned subscriptions for tenant: ${tenantId}`, error);
    }
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhookSignature(payload: Buffer, signature: string, secret: string): Promise<Stripe.Event> {
    // For webhook verification, we need to use the global Stripe instance
    // since webhooks come from Stripe directly, not from a specific tenant
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }
    
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }

  /**
   * Create products and prices in Stripe for a tenant
   */
  async createStripeProductsAndPrices(tenantId: string): Promise<{
    basicPriceId: string;
    proPriceId: string;
    enterprisePriceId: string;
  }> {
    const stripe = await this.getStripeForTenant(tenantId);
    if (!stripe) {
      throw new Error('Stripe is not configured for this tenant');
    }

    try {
      this.logger.log(`Creating Stripe products and prices for tenant: ${tenantId}`);

      // Create Basic Plan Product
      const basicProduct = await stripe.products.create({
        name: 'Basic Plan',
        description: 'Basic plan for small businesses',
        metadata: {
          tenantId,
          planType: 'basic',
        },
      });

      const basicPrice = await stripe.prices.create({
        product: basicProduct.id,
        unit_amount: 0, // Free plan
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
        metadata: {
          tenantId,
          planType: 'basic',
        },
      });

      // Create Pro Plan Product
      const proProduct = await stripe.products.create({
        name: 'Pro Plan',
        description: 'Professional plan for growing businesses',
        metadata: {
          tenantId,
          planType: 'pro',
        },
      });

      const proPrice = await stripe.prices.create({
        product: proProduct.id,
        unit_amount: 2900, // $29.00 in cents
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
        metadata: {
          tenantId,
          planType: 'pro',
        },
      });

      // Create Enterprise Plan Product
      const enterpriseProduct = await stripe.products.create({
        name: 'Enterprise Plan',
        description: 'Enterprise plan for large organizations',
        metadata: {
          tenantId,
          planType: 'enterprise',
        },
      });

      const enterprisePrice = await stripe.prices.create({
        product: enterpriseProduct.id,
        unit_amount: 9900, // $99.00 in cents
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
        metadata: {
          tenantId,
          planType: 'enterprise',
        },
      });

      // Store the price IDs in tenant configuration
      await Promise.all([
        this.tenantConfigurationService.setStripePriceId(tenantId, 'basic', basicPrice.id),
        this.tenantConfigurationService.setStripePriceId(tenantId, 'pro', proPrice.id),
        this.tenantConfigurationService.setStripePriceId(tenantId, 'enterprise', enterprisePrice.id),
      ]);

      this.logger.log(`Successfully created Stripe products and prices for tenant: ${tenantId}`);

      return {
        basicPriceId: basicPrice.id,
        proPriceId: proPrice.id,
        enterprisePriceId: enterprisePrice.id,
      };
    } catch (error) {
      this.logger.error(`Failed to create Stripe products and prices for tenant: ${tenantId}`, error);
      throw new InternalServerErrorException('Failed to create Stripe products and prices');
    }
  }

  /**
   * Update product prices in Stripe
   */
  async updateStripePrices(
    tenantId: string,
    prices: {
      basicPrice?: number;
      proPrice?: number;
      enterprisePrice?: number;
    }
  ): Promise<{
    basicPriceId: string;
    proPriceId: string;
    enterprisePriceId: string;
  }> {
    const stripe = await this.getStripeForTenant(tenantId);
    if (!stripe) {
      throw new Error('Stripe is not configured for this tenant');
    }

    try {
      this.logger.log(`Updating Stripe prices for tenant: ${tenantId}`);

      const results: any = {};

      // Update Basic Plan Price
      if (prices.basicPrice !== undefined) {
        const basicPriceId = await this.tenantConfigurationService.getStripePriceId(tenantId, 'basic');
        if (basicPriceId) {
          // Create new price (Stripe doesn't allow updating existing prices)
          const basicPrice = await stripe.prices.create({
            product: (await stripe.prices.retrieve(basicPriceId)).product as string,
            unit_amount: prices.basicPrice * 100, // Convert to cents
            currency: 'usd',
            recurring: {
              interval: 'month',
            },
            metadata: {
              tenantId,
              planType: 'basic',
            },
          });
          await this.tenantConfigurationService.setStripePriceId(tenantId, 'basic', basicPrice.id);
          results.basicPriceId = basicPrice.id;
        }
      }

      // Update Pro Plan Price
      if (prices.proPrice !== undefined) {
        const proPriceId = await this.tenantConfigurationService.getStripePriceId(tenantId, 'pro');
        if (proPriceId) {
          const proPrice = await stripe.prices.create({
            product: (await stripe.prices.retrieve(proPriceId)).product as string,
            unit_amount: prices.proPrice * 100,
            currency: 'usd',
            recurring: {
              interval: 'month',
            },
            metadata: {
              tenantId,
              planType: 'pro',
            },
          });
          await this.tenantConfigurationService.setStripePriceId(tenantId, 'pro', proPrice.id);
          results.proPriceId = proPrice.id;
        }
      }

      // Update Enterprise Plan Price
      if (prices.enterprisePrice !== undefined) {
        const enterprisePriceId = await this.tenantConfigurationService.getStripePriceId(tenantId, 'enterprise');
        if (enterprisePriceId) {
          const enterprisePrice = await stripe.prices.create({
            product: (await stripe.prices.retrieve(enterprisePriceId)).product as string,
            unit_amount: prices.enterprisePrice * 100,
            currency: 'usd',
            recurring: {
              interval: 'month',
            },
            metadata: {
              tenantId,
              planType: 'enterprise',
            },
          });
          await this.tenantConfigurationService.setStripePriceId(tenantId, 'enterprise', enterprisePrice.id);
          results.enterprisePriceId = enterprisePrice.id;
        }
      }

      // Get current price IDs for any that weren't updated
      const [currentBasicPriceId, currentProPriceId, currentEnterprisePriceId] = await Promise.all([
        this.tenantConfigurationService.getStripePriceId(tenantId, 'basic'),
        this.tenantConfigurationService.getStripePriceId(tenantId, 'pro'),
        this.tenantConfigurationService.getStripePriceId(tenantId, 'enterprise'),
      ]);

      return {
        basicPriceId: results.basicPriceId || currentBasicPriceId || '',
        proPriceId: results.proPriceId || currentProPriceId || '',
        enterprisePriceId: results.enterprisePriceId || currentEnterprisePriceId || '',
      };
    } catch (error) {
      this.logger.error(`Failed to update Stripe prices for tenant: ${tenantId}`, error);
      throw new InternalServerErrorException('Failed to update Stripe prices');
    }
  }

  /**
   * Create a payment intent for one-time payments
   */
  async createPaymentIntent(
    tenantId: string,
    params: {
      amount: number;
      currency?: string;
      description?: string;
      metadata?: Record<string, any>;
      paymentMethod?: string;
      confirm?: boolean;
      customerId?: string;
      setupFutureUsage?: 'on_session' | 'off_session';
    }
  ): Promise<Stripe.PaymentIntent> {
    const {
      amount,
      currency = 'usd',
      description,
      metadata = {},
      paymentMethod,
      confirm = false,
      customerId,
      setupFutureUsage
    } = params;

    const stripe = await this.getStripeForTenant(tenantId);
    if (!stripe) {
      throw new Error('Stripe is not configured for this tenant');
    }

    try {
      this.logger.log(`Creating payment intent for tenant: ${tenantId}, amount: ${amount}`);

      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        description,
        metadata: {
          tenantId,
          ...metadata,
        },
        setup_future_usage: setupFutureUsage,
        customer: customerId,
        confirm,
        payment_method: paymentMethod,
        // Enable automatic payment methods if no specific payment method is provided
        ...(!paymentMethod && {
          automatic_payment_methods: {
            enabled: true,
          },
        }),
      };

      // Remove undefined values
      Object.keys(paymentIntentParams).forEach(
        (key) => paymentIntentParams[key] === undefined && delete paymentIntentParams[key]
      );

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

      await this.auditLogService.log('system', 'payment_intent_created', {
        tenantId,
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
      });

      this.logger.log(`Successfully created payment intent: ${paymentIntent.id} for tenant: ${tenantId}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error(`Failed to create payment intent for tenant: ${tenantId}`, error);
      throw new InternalServerErrorException('Failed to create payment intent');
    }
  }

  /**
   * Create an invoice in Stripe
   */
  async createInvoice(
    tenantId: string,
    subscriptionId: string,
    amount: number,
    currency: string,
  ): Promise<Stripe.Invoice> {
    const stripe = await this.getStripeForTenant(tenantId);
    if (!stripe) {
      throw new Error('Stripe is not configured for this tenant');
    }

    try {
      this.logger.log(`Creating invoice for tenant: ${tenantId}, subscription: ${subscriptionId}`);

      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { stripeCustomerId: true },
      });

      if (!tenant?.stripeCustomerId) {
        throw new Error('No Stripe customer found for tenant');
      }

      const invoice = await stripe.invoices.create({
        customer: tenant.stripeCustomerId,
        subscription: subscriptionId,
        collection_method: 'charge_automatically',
        metadata: {
          tenantId,
        },
      });

      // Add invoice item
      await stripe.invoiceItems.create({
        customer: tenant.stripeCustomerId,
        invoice: invoice.id,
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        description: 'Subscription payment',
      });

      await this.auditLogService.log('system', 'invoice_created', {
        tenantId,
        invoiceId: invoice.id,
        amount,
        currency,
      });

      this.logger.log(`Successfully created invoice: ${invoice.id} for tenant: ${tenantId}`);
      return invoice;
    } catch (error) {
      this.logger.error(`Failed to create invoice for tenant: ${tenantId}`, error);
      throw new InternalServerErrorException('Failed to create invoice');
    }
  }

  /**
   * Create a refund
   */
  async createRefund(
    tenantId: string,
    paymentIntentId: string,
    amount?: number,
    reason?: string,
  ): Promise<Stripe.Refund> {
    const stripe = await this.getStripeForTenant(tenantId);
    if (!stripe) {
      throw new Error('Stripe is not configured for this tenant');
    }

    try {
      this.logger.log(`Creating refund for tenant: ${tenantId}, payment: ${paymentIntentId}`);

      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined, // Convert to cents
        reason: reason as any,
        metadata: {
          tenantId,
        },
      });

      await this.auditLogService.log('system', 'refund_created', {
        tenantId,
        refundId: refund.id,
        paymentIntentId,
        amount,
        reason,
      });

      this.logger.log(`Successfully created refund: ${refund.id} for tenant: ${tenantId}`);
      return refund;
    } catch (error) {
      this.logger.error(`Failed to create refund for tenant: ${tenantId}`, error);
      throw new InternalServerErrorException('Failed to create refund');
    }
  }

  /**
   * Get payment methods for a customer
   */
  async getPaymentMethods(tenantId: string, customerId: string): Promise<Stripe.PaymentMethod[]> {
    const stripe = await this.getStripeForTenant(tenantId);
    if (!stripe) {
      throw new Error('Stripe is not configured for this tenant');
    }

    try {
      this.logger.log(`Getting payment methods for tenant: ${tenantId}, customer: ${customerId}`);

      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      this.logger.log(`Successfully retrieved ${paymentMethods.data.length} payment methods for tenant: ${tenantId}`);
      return paymentMethods.data;
    } catch (error) {
      this.logger.error(`Failed to get payment methods for tenant: ${tenantId}`, error);
      throw new InternalServerErrorException('Failed to get payment methods');
    }
  }

  /**
   * Attach a payment method to a customer
   */
  async attachPaymentMethod(tenantId: string, customerId: string, paymentMethodId: string): Promise<void> {
    const stripe = await this.getStripeForTenant(tenantId);
    if (!stripe) {
      throw new Error('Stripe is not configured for this tenant');
    }

    try {
      this.logger.log(`Attaching payment method ${paymentMethodId} to customer ${customerId} for tenant: ${tenantId}`);

      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

  await this.auditLogService.log(null, 'payment_method_attached', {
        tenantId,
        customerId,
        paymentMethodId,
      });

      this.logger.log(`Successfully attached payment method ${paymentMethodId} for tenant: ${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to attach payment method for tenant: ${tenantId}`, error);
      throw new InternalServerErrorException('Failed to attach payment method');
    }
  }

  /**
   * Detach a payment method from a customer
   */
  async detachPaymentMethod(tenantId: string, paymentMethodId: string): Promise<void> {
    const stripe = await this.getStripeForTenant(tenantId);
    if (!stripe) {
      throw new Error('Stripe is not configured for this tenant');
    }

    try {
      this.logger.log(`Detaching payment method ${paymentMethodId} for tenant: ${tenantId}`);

      await stripe.paymentMethods.detach(paymentMethodId);

      await this.auditLogService.log('system', 'payment_method_detached', {
        tenantId,
        paymentMethodId,
      });

      this.logger.log(`Successfully detached payment method ${paymentMethodId} for tenant: ${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to detach payment method for tenant: ${tenantId}`, error);
      throw new InternalServerErrorException('Failed to detach payment method');
    }
  }

  /**
   * Create a payment intent for one-time payments
   */
  async createOneTimePaymentIntent(
    tenantId: string,
    amount: number,
    currency: string,
    description: string,
    metadata: Record<string, any> = {},
    paymentMethod?: string,
    confirm = false,
    savePaymentMethod = false,
    customerId?: string,
  ): Promise<Stripe.PaymentIntent> {
    const stripe = await this.getStripeForTenant(tenantId);
    if (!stripe) {
      throw new Error('Stripe is not configured for this tenant');
    }

    try {
      this.logger.log(`Creating one-time payment intent for tenant: ${tenantId}, amount: ${amount}`);

      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        description,
        metadata: {
          tenantId,
          ...metadata,
        },
        payment_method: paymentMethod,
        confirm,
        customer: customerId,
        setup_future_usage: savePaymentMethod ? 'off_session' : undefined,
      };

      // If we're not confirming immediately, don't include payment method
      if (!confirm) {
        delete paymentIntentParams.payment_method;
        delete paymentIntentParams.confirm;
        delete paymentIntentParams.setup_future_usage;
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

      await this.auditLogService.log('system', 'one_time_payment_intent_created', {
        tenantId,
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
      });

      this.logger.log(`Successfully created one-time payment intent: ${paymentIntent.id} for tenant: ${tenantId}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error(`Failed to create one-time payment intent for tenant: ${tenantId}`, error);
      throw new InternalServerErrorException('Failed to create one-time payment intent');
    }
  }

  /**
   * Retrieve a payment intent
   */
  async retrievePaymentIntent(tenantId: string, paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    const stripe = await this.getStripeForTenant(tenantId);
    if (!stripe) {
      throw new Error('Stripe is not configured for this tenant');
    }

    try {
      this.logger.log(`Retrieving payment intent ${paymentIntentId} for tenant: ${tenantId}`);

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      this.logger.log(`Successfully retrieved payment intent ${paymentIntentId} for tenant: ${tenantId}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error(`Failed to retrieve payment intent ${paymentIntentId} for tenant: ${tenantId}`, error);
      throw new InternalServerErrorException('Failed to retrieve payment intent');
    }
  }

  /**
   * Confirm a payment intent
   */
  async confirmPaymentIntent(
    tenantId: string,
    paymentIntentId: string,
    paymentMethodId: string,
  ): Promise<Stripe.PaymentIntent> {
    const stripe = await this.getStripeForTenant(tenantId);
    if (!stripe) {
      throw new Error('Stripe is not configured for this tenant');
    }

    try {
      this.logger.log(`Confirming payment intent ${paymentIntentId} for tenant: ${tenantId}`);

      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });

      await this.auditLogService.log('system', 'payment_intent_confirmed', {
        tenantId,
        paymentIntentId,
      });

      this.logger.log(`Successfully confirmed payment intent ${paymentIntentId} for tenant: ${tenantId}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error(`Failed to confirm payment intent ${paymentIntentId} for tenant: ${tenantId}`, error);
      throw new InternalServerErrorException('Failed to confirm payment intent');
    }
  }
}