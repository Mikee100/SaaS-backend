import { Controller, Get, Post, Body, Req, UseGuards, Param, Query } from '@nestjs/common';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RawBodyRequest } from '@nestjs/common';
import { Response } from 'express';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly stripeService: StripeService,
  ) {}

  @Get('test')
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

  @Get('plans')
  @Permissions('view_billing')
  async getPlans() {
    return this.billingService.getPlans();
  }

  @Get('subscription')
  async getCurrentSubscription(@Req() req) {
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
  @Permissions('view_billing')
  async getInvoices(@Req() req) {
    return this.billingService.getInvoices(req.user.tenantId);
  }

  @Post('create-checkout-session')
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
  @Permissions('edit_billing')
  async createPortalSession(
    @Body() body: { returnUrl: string },
    @Req() req,
  ) {
    const session = await this.stripeService.createBillingPortalSession(
      req.user.tenantId,
      body.returnUrl,
      req.user.id,
    );
    return { url: session.url };
  }

  @Post('cancel-subscription')
  @Permissions('edit_billing')
  async cancelSubscription(@Req() req) {
    await this.stripeService.cancelSubscription(req.user.tenantId, req.user.id);
    return { message: 'Subscription will be canceled at the end of the current period' };
  }

  @Get('subscription-details')
  @Permissions('view_billing')
  async getSubscriptionDetails(@Req() req) {
    const subscription = await this.stripeService.getSubscriptionDetails(req.user.tenantId);
    return subscription;
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
} 