import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { SubscriptionService } from './subscription.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TrialGuard } from '../auth/trial.guard';
import { RawBodyRequest } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma.service';
import { Param } from '@nestjs/common';

@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private readonly billingService: BillingService,
    private readonly stripeService: StripeService,
    private readonly subscriptionService: SubscriptionService,
    private readonly prisma: PrismaService,
  ) {}

  private resolveBillingUrls(req: any, successUrl?: string, cancelUrl?: string) {
    const origin =
      req.headers?.origin ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000';

    return {
      successUrl:
        successUrl ||
        `${origin}/settings/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: cancelUrl || `${origin}/settings/billing/subscription?checkout=cancelled`,
    };
  }

  private async resolvePriceIdForCheckout(
    tenantId: string,
    body: { planId?: string; priceId?: string },
  ): Promise<string> {
    if (body.priceId) {
      return body.priceId;
    }

    if (!body.planId) {
      throw new BadRequestException('Either planId or priceId is required');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: body.planId },
      select: { id: true, stripePriceId: true },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    if (!plan.stripePriceId) {
      throw new BadRequestException(
        'Selected plan is not mapped to a Stripe price',
      );
    }

    return plan.stripePriceId;
  }
  // ADMIN: Get all tenants and their subscriptions
  @Get('admin/billing/tenants')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('edit_billing')
  async getAllTenantSubscriptions() {
    return this.billingService.getAllTenantSubscriptions();
  }

  @Get('test')
  @UseGuards(AuthGuard('jwt'))
  async testEndpoint() {
    try {
      // Test database connection
      const plans = await this.billingService.getPlans();
      return {
        message: 'Billing service is working',
        plansCount: plans.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Test endpoint error:', error);
      return {
        error: (error as any).message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('test-subscription')
  @UseGuards(AuthGuard('jwt'))
  async testSubscription(@Req() req) {
    try {
      if (!req.user?.tenantId) {
        return {
          error: 'No tenant ID found in user object',
          user: req.user,
          timestamp: new Date().toISOString(),
        };
      }

      const subscription = await this.billingService.getCurrentSubscription(
        req.user.tenantId,
      );
      return {
        message: 'Subscription test successful',
        tenantId: req.user.tenantId,
        subscription,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Subscription test error:', error);
      return {
        error: (error as any).message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('health')
  @UseGuards(AuthGuard('jwt'))
  async healthCheck() {
    return {
      status: 'ok',
      service: 'billing',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('access-status')
  @UseGuards(AuthGuard('jwt'))
  async getAccessStatus(@Req() req) {
    return this.billingService.getAccessStatus(
      req.user?.tenantId,
      !!req.user?.isSuperadmin,
    );
  }

  @Get('plans')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
  @Permissions('view_billing')
  async getPlans() {
    return this.billingService.getPlans();
  }

  @Get('subscription-with-permissions')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
  @Permissions('view_billing')
  async getCurrentSubscriptionWithPermissions(@Req() req) {
    try {
      if (!req.user?.tenantId) {
        throw new Error('No tenant ID found in user object');
      }

      return this.billingService.getCurrentSubscription(req.user.tenantId);
    } catch (error) {
      throw error;
    }
  }

  @Get('limits')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('view_billing')
  async getPlanLimits(@Req() req) {
    try {
      if (!req.user?.tenantId) {
        throw new Error('No tenant ID found in user object');
      }

      return this.billingService.getPlanLimits(req.user.tenantId);
    } catch (error) {
      throw error;
    }
  }

  @Get('invoices')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
  @Permissions('view_billing')
  async getInvoices(@Req() req) {
    return this.billingService.getInvoices(req.user.tenantId);
  }

  @Post('create-subscription')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
  @Permissions('edit_billing')
  async createSubscription(@Body() body: { planId: string }, @Req() req) {
    try {
      if (!req.user?.tenantId) {
        throw new Error('No tenant ID found in user object');
      }

      const plan = await this.prisma.plan.findUnique({
        where: { id: body.planId },
        select: {
          id: true,
          name: true,
          price: true,
          stripePriceId: true,
        },
      });

      if (!plan) {
        throw new NotFoundException('Plan not found');
      }

      // Paid plans must flow through Stripe Checkout to avoid local/Stripe state drift.
      if (plan.price > 0) {
        if (!plan.stripePriceId) {
          throw new BadRequestException(
            'Paid plan is missing Stripe price mapping',
          );
        }

        const { successUrl, cancelUrl } = this.resolveBillingUrls(req);
        const session = await this.stripeService.createCheckoutSession(
          req.user.tenantId,
          plan.stripePriceId,
          successUrl,
          cancelUrl,
          req.user.id,
        );

        return {
          message: 'Checkout session created',
          requiresCheckout: true,
          sessionId: session.id,
          url: session.url,
        };
      }

      const subscription = await this.subscriptionService.createSubscription({
        tenantId: req.user.tenantId,
        planId: body.planId,
        userId: req.user.id,
      });

      return {
        message: 'Subscription created successfully',
        requiresCheckout: false,
        subscription,
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('create-checkout-session')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
  @Permissions('edit_billing')
  async createCheckoutSession(
    @Body()
    body: {
      planId?: string;
      priceId?: string;
      successUrl?: string;
      cancelUrl?: string;
    },
    @Req() req,
  ) {
    const priceId = await this.resolvePriceIdForCheckout(req.user.tenantId, body);
    const { successUrl, cancelUrl } = this.resolveBillingUrls(
      req,
      body.successUrl,
      body.cancelUrl,
    );

    const session = await this.stripeService.createCheckoutSession(
      req.user.tenantId,
      priceId,
      successUrl,
      cancelUrl,
      req.user.id,
    );
    return { sessionId: session.id, url: session.url };
  }

  @Post('sync-checkout-session')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
  @Permissions('view_billing')
  async syncCheckoutSession(
    @Body() body: { sessionId: string },
    @Req() req,
  ) {
    if (!body?.sessionId) {
      throw new BadRequestException('sessionId is required');
    }

    return this.stripeService.syncCheckoutSession(
      req.user.tenantId,
      body.sessionId,
      req.user.id,
    );
  }

  @Post('sync-records')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
  @Permissions('view_billing')
  async syncBillingRecords(@Req() req) {
    return this.stripeService.syncTenantBillingRecords(
      req.user.tenantId,
      req.user.id,
    );
  }

  @Post('create-portal-session')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
  @Permissions('edit_billing')
  async createPortalSession(@Body() body: { returnUrl: string }, @Req() req) {
    const session = await this.stripeService.createBillingPortalSession(
      req.user.tenantId,
      body.returnUrl,
      req.user.id,
    );
    return { url: session.url };
  }

  @Post('cancel-subscription')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
  @Permissions('edit_billing')
  async cancelSubscription(@Req() req) {
    await this.stripeService.cancelSubscription(req.user.tenantId, req.user.id);
    return {
      message: 'Subscription will be canceled at the end of the current period',
    };
  }

  @Get('subscription-details')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
  @Permissions('view_billing')
  async getSubscriptionDetails(@Req() req) {
    const subscription = await this.stripeService.getSubscription(
      req.user.tenantId,
    );
    return subscription;
  }

  @Post('cleanup-orphaned-subscriptions')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
  @Permissions('edit_billing')
  async cleanupOrphanedSubscriptions(@Req() req) {
    await this.stripeService.cleanupOrphanedSubscriptions(req.user.tenantId);
    return { message: 'Orphaned subscriptions cleaned up successfully' };
  }

  @Post('webhook')
  async handleWebhook(@Req() req: RawBodyRequest<Request>) {
    const sig = req.headers['stripe-signature'];
    const rawBody = req.rawBody;

    if (!sig || !rawBody) {
      throw new Error('Missing stripe signature or body');
    }

    try {
      const event = await this.stripeService.verifyWebhookSignature(
        rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );

      await this.stripeService.handleWebhook(event);
      return { received: true };
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      throw new Error('Webhook signature verification failed');
    }
  }

  @Post('webhook/:tenantId')
  async handleTenantWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: any,
    @Param('tenantId') tenantId: string,
  ) {
    const sig = req.headers['stripe-signature'];
    const rawBody = req.rawBody;

    if (!sig || !rawBody) {
      throw new BadRequestException('Missing Stripe signature or raw body');
    }

    try {
      const secret = await this.stripeService.getTenantWebhookSecret(tenantId);
      if (!secret) {
        throw new NotFoundException('Webhook secret not configured for tenant');
      }

      const event = await this.stripeService.verifyWebhookSignature(
        rawBody,
        sig,
        secret,
      );

      await this.stripeService.handleWebhook(event);
      return { received: true };
    } catch (err) {
      this.logger.error('Webhook verification failed:', err);
      throw new BadRequestException('Webhook verification failed');
    }
  }

  @Post('create-payment-intent')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('edit_billing')
  async createPaymentIntent(
    @Req() req: any,
    @Body()
    body: {
      amount: number;
      currency?: string;
      description?: string;
      metadata?: any;
      paymentMethodId?: string;
      savePaymentMethod?: boolean;
    },
  ) {
    try {
      const {
        amount,
        currency = 'usd',
        description,
        metadata,
        paymentMethodId,
        savePaymentMethod = false,
      } = body;

      // Validate amount
      if (!amount || amount < 50) {
        // Minimum charge is $0.50
        throw new Error('Invalid amount');
      }

      // Get tenant's Stripe customer ID or create one
      let customerId = req.user.tenant.stripeCustomerId;
      if (!customerId && req.user.tenant.contactEmail) {
        // Create a new Stripe customer if one doesn't exist
        const customer = await this.stripeService.createCustomer(
          req.user.tenantId,
          req.user.tenant.contactEmail,
          req.user.tenant.name,
        );
        customerId = customer.id;

        // Update tenant with Stripe customer ID
        await this.prisma.tenant.update({
          where: { id: req.user.tenantId },
          data: { stripeCustomerId: customerId },
        });
      }

      // Create payment intent
      const paymentIntent = await this.stripeService.createPaymentIntent(
        req.user.tenantId,
        {
          amount: Math.round(amount * 100), // Convert to cents
          currency,
          description,
          metadata: {
            ...metadata,
            tenantId: req.user.tenantId,
            userId: req.user.userId,
            type: 'one_time',
          },
          paymentMethod: paymentMethodId,
          confirm: !!paymentMethodId, // Auto-confirm if using saved payment method
          customerId,
          setupFutureUsage: savePaymentMethod ? 'off_session' : undefined,
        },
      );

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      this.logger.error('Error creating payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  @Post('record-one-time-payment')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('edit_billing')
  async recordOneTimePayment(
    @Req() req: any,
    @Body()
    body: {
      paymentId: string;
      amount: number;
      description: string;
      metadata?: any;
    },
  ) {
    try {
      const { paymentId, amount, description, metadata = {} } = body;

      // Verify the payment with Stripe
      const paymentIntent = await this.stripeService.retrievePaymentIntent(
        req.user.tenantId,
        paymentId,
      );

      if (paymentIntent.status !== 'succeeded') {
        throw new Error('Payment not completed');
      }

      // Record the payment in your database
      const now = new Date();
      const payment = await this.prisma.payment.create({
        data: {
          id: paymentId,
          amount: amount / 100, // Convert from cents to dollars
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          description,
          metadata: {
            ...(metadata || {}),
            userId: req.user.userId, // Store user ID in metadata
            stripe_payment_intent_id: paymentIntent.id,
          },
          stripePaymentIntentId: paymentIntent.id,
          tenantId: req.user.tenantId,
          createdAt: now,
          updatedAt: now,
        },
      });

      // Apply any business logic for the successful payment
      await this.applyPaymentBenefits(req.user.tenantId, amount, metadata);

      return { success: true, payment };
    } catch (error) {
      this.logger.error('Error recording one-time payment:', error);
      throw new Error('Failed to record payment');
    }
  }

  private async applyPaymentBenefits(
    tenantId: string,
    amount: number,
    metadata: any,
  ) {
    // Add credits to the tenant's account using raw query to ensure type safety
    await this.prisma.$executeRaw`
      UPDATE "Tenant" 
      SET credits = COALESCE(credits, 0) + ${Math.floor(amount / 100)}
      WHERE id = ${tenantId}
    `;
  }

  @Post('superadmin/assign-subscription')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('superadmin')
  async assignSubscription(
    @Body() body: { tenantId: string; planId: string },
    @Req() req,
  ) {
    try {
      const userId = req.user?.userId ?? req.user?.id ?? req.user?.sub;
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      const result = await this.subscriptionService.createSubscription({
        tenantId: body.tenantId,
        planId: body.planId,
        userId,
      });

      return {
        success: true,
        subscription: result,
      };
    } catch (error) {
      this.logger.error('Failed to assign subscription:', error);
      throw error;
    }
  }
}
