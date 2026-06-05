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
import { RequireModules } from '../auth/module-access.decorator';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma.service';
import { Param } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/request.types';

type BillingRequest = AuthenticatedRequest & {
  user: AuthenticatedRequest['user'] & {
    id?: string;
    tenant?: {
      stripeCustomerId?: string | null;
      contactEmail?: string | null;
      name?: string | null;
    };
  };
};

@Controller('billing')
@RequireModules('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private readonly billingService: BillingService,
    private readonly stripeService: StripeService,
    private readonly subscriptionService: SubscriptionService,
    private readonly prisma: PrismaService,
  ) {}

  private getTenantId(req: AuthenticatedRequest): string {
    if (!req.user?.tenantId) {
      throw new BadRequestException('No tenant ID found in user object');
    }
    return req.user.tenantId;
  }

  private getUserId(req: BillingRequest): string {
    const userId = req.user?.userId ?? req.user?.id ?? req.user?.sub;
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    return userId;
  }

  private resolveBillingUrls(
    req: Pick<Request, 'headers'>,
    successUrl?: string,
    cancelUrl?: string,
  ) {
    const originHeader = req.headers?.origin;
    const origin =
      typeof originHeader === 'string'
        ? originHeader
        : process.env.FRONTEND_URL || 'http://localhost:3000';

    return {
      successUrl:
        successUrl ||
        `${origin}/settings/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl:
        cancelUrl ||
        `${origin}/settings/billing/subscription?checkout=cancelled`,
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
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('test-subscription')
  @UseGuards(AuthGuard('jwt'))
  async testSubscription(@Req() req: AuthenticatedRequest) {
    try {
      const subscription = await this.billingService.getCurrentSubscription(
        this.getTenantId(req),
      );
      return {
        message: 'Subscription test successful',
        tenantId: this.getTenantId(req),
        subscription,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Subscription test error:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('health')
  @UseGuards(AuthGuard('jwt'))
  healthCheck() {
    return {
      status: 'ok',
      service: 'billing',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('access-status')
  @UseGuards(AuthGuard('jwt'))
  async getAccessStatus(@Req() req: AuthenticatedRequest) {
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
  async getCurrentSubscriptionWithPermissions(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.billingService.getCurrentSubscription(this.getTenantId(req));
  }

  @Get('limits')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('view_billing')
  async getPlanLimits(@Req() req: AuthenticatedRequest) {
    return this.billingService.getPlanLimits(this.getTenantId(req));
  }

  @Get('invoices')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
  @Permissions('view_billing')
  async getInvoices(@Req() req: AuthenticatedRequest) {
    return this.billingService.getInvoices(this.getTenantId(req));
  }

  @Post('create-subscription')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
  @Permissions('edit_billing')
  async createSubscription(
    @Body() body: { planId: string },
    @Req() req: BillingRequest,
  ) {
    const tenantId = this.getTenantId(req);

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
        tenantId,
        plan.stripePriceId,
        successUrl,
        cancelUrl,
        this.getUserId(req),
      );

      return {
        message: 'Checkout session created',
        requiresCheckout: true,
        sessionId: session.id,
        url: session.url,
      };
    }

    const subscription = await this.subscriptionService.createSubscription({
      tenantId,
      planId: body.planId,
      userId: this.getUserId(req),
    });

    return {
      message: 'Subscription created successfully',
      requiresCheckout: false,
      subscription,
    };
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
    @Req() req: BillingRequest,
  ) {
    const tenantId = this.getTenantId(req);
    const priceId = await this.resolvePriceIdForCheckout(tenantId, body);
    const { successUrl, cancelUrl } = this.resolveBillingUrls(
      req,
      body.successUrl,
      body.cancelUrl,
    );

    const session = await this.stripeService.createCheckoutSession(
      tenantId,
      priceId,
      successUrl,
      cancelUrl,
      this.getUserId(req),
    );
    return { sessionId: session.id, url: session.url };
  }

  @Post('sync-checkout-session')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
  @Permissions('view_billing')
  async syncCheckoutSession(
    @Body() body: { sessionId: string },
    @Req() req: BillingRequest,
  ) {
    if (!body?.sessionId) {
      throw new BadRequestException('sessionId is required');
    }

    return this.stripeService.syncCheckoutSession(
      this.getTenantId(req),
      body.sessionId,
      this.getUserId(req),
    );
  }

  @Post('sync-records')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
  @Permissions('view_billing')
  async syncBillingRecords(@Req() req: BillingRequest) {
    return this.stripeService.syncTenantBillingRecords(
      this.getTenantId(req),
      this.getUserId(req),
    );
  }

  @Post('create-portal-session')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
  @Permissions('edit_billing')
  async createPortalSession(
    @Body() body: { returnUrl: string },
    @Req() req: BillingRequest,
  ) {
    const session = await this.stripeService.createBillingPortalSession(
      this.getTenantId(req),
      body.returnUrl,
      this.getUserId(req),
    );
    return { url: session.url };
  }

  @Post('cancel-subscription')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
  @Permissions('edit_billing')
  async cancelSubscription(@Req() req: BillingRequest) {
    await this.stripeService.cancelSubscription(
      this.getTenantId(req),
      this.getUserId(req),
    );
    return {
      message: 'Subscription will be canceled at the end of the current period',
    };
  }

  @Get('subscription-details')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
  @Permissions('view_billing')
  async getSubscriptionDetails(@Req() req: AuthenticatedRequest) {
    const subscription = await this.stripeService.getSubscription(
      this.getTenantId(req),
    );
    return subscription;
  }

  @Post('cleanup-orphaned-subscriptions')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
  @Permissions('edit_billing')
  async cleanupOrphanedSubscriptions(@Req() req: AuthenticatedRequest) {
    await this.stripeService.cleanupOrphanedSubscriptions(
      this.getTenantId(req),
    );
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
    @Req() req: BillingRequest,
    @Body()
    body: {
      amount: number;
      currency?: string;
      description?: string;
      metadata?: Record<string, unknown>;
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
      const tenant = req.user.tenant;
      let customerId = tenant?.stripeCustomerId;
      if (!customerId && tenant?.contactEmail) {
        // Create a new Stripe customer if one doesn't exist
        const customer = await this.stripeService.createCustomer(
          this.getTenantId(req),
          tenant.contactEmail,
          tenant.name || '',
        );
        customerId = customer.id;

        // Update tenant with Stripe customer ID
        await this.prisma.tenant.update({
          where: { id: this.getTenantId(req) },
          data: { stripeCustomerId: customerId },
        });
      }

      // Create payment intent
      const paymentIntent = await this.stripeService.createPaymentIntent(
        this.getTenantId(req),
        {
          amount: Math.round(amount * 100), // Convert to cents
          currency,
          description,
          metadata: {
            ...metadata,
            tenantId: this.getTenantId(req),
            userId: this.getUserId(req),
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
    @Req() req: BillingRequest,
    @Body()
    body: {
      paymentId: string;
      amount: number;
      description: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    try {
      const { paymentId, amount, description, metadata = {} } = body;

      // Verify the payment with Stripe
      const paymentIntent = await this.stripeService.retrievePaymentIntent(
        this.getTenantId(req),
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
            userId: this.getUserId(req), // Store user ID in metadata
            stripe_payment_intent_id: paymentIntent.id,
          },
          stripePaymentIntentId: paymentIntent.id,
          tenantId: this.getTenantId(req),
          createdAt: now,
          updatedAt: now,
        },
      });

      // Apply any business logic for the successful payment
      await this.applyPaymentBenefits(this.getTenantId(req), amount);

      return { success: true, payment };
    } catch (error) {
      this.logger.error('Error recording one-time payment:', error);
      throw new Error('Failed to record payment');
    }
  }

  private async applyPaymentBenefits(tenantId: string, amount: number) {
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
    @Req() req: BillingRequest,
  ) {
    try {
      const userId = this.getUserId(req);

      const result = await this.subscriptionService.createSubscription({
        tenantId: body.tenantId,
        planId: body.planId,
        userId,
        allowManualPaidPlans: true,
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
