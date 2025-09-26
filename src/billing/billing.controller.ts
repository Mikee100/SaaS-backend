import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { SubscriptionService } from './subscription.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RawBodyRequest } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma.service';

@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private readonly billingService: BillingService,
    private readonly stripeService: StripeService,
    private readonly subscriptionService: SubscriptionService,
    private readonly prisma: PrismaService,
  ) {}
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
        error: error.message,
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
        error: error.message,
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

  @Get('plans')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('view_billing')
  async getPlans() {
    return this.billingService.getPlans();
  }

  @Get('subscription-with-permissions')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
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
  @UseGuards(AuthGuard('jwt'))
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
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('view_billing')
  async getInvoices(@Req() req) {
    return this.billingService.getInvoices(req.user.tenantId);
  }

  @Post('create-subscription')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('edit_billing')
  async createSubscription(@Body() body: { planId: string }, @Req() req) {
    try {
      if (!req.user?.tenantId) {
        throw new Error('No tenant ID found in user object');
      }

      const subscription = await this.subscriptionService.createSubscription({
        tenantId: req.user.tenantId,
        planId: body.planId,
      });

      return {
        message: 'Subscription created successfully',
        subscription,
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('create-checkout-session')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('edit_billing')
  async createCheckoutSession(
    @Body() body: { priceId: string; successUrl: string; cancelUrl: string },
    @Req() req,
  ) {
    const session = await this.stripeService.createCheckoutSession(
      req.user.tenantId,
      body.priceId,
      body.successUrl,
      body.cancelUrl,
      req.user.id,
    );
    return { sessionId: session.id, url: session.url };
  }

  @Post('create-portal-session')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
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
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('edit_billing')
  async cancelSubscription(@Req() req) {
    await this.stripeService.cancelSubscription(req.user.tenantId, req.user.id);
    return {
      message: 'Subscription will be canceled at the end of the current period',
    };
  }

  @Get('subscription-details')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('view_billing')
  async getSubscriptionDetails(@Req() req) {
    const subscription = await this.stripeService.getSubscription(
      req.user.tenantId,
    );
    return subscription;
  }

  @Post('cleanup-orphaned-subscriptions')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
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

  @Post('create-payment-intent')
  @UseGuards(AuthGuard('jwt'))
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
  @UseGuards(AuthGuard('jwt'))
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
}
