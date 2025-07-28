import { Controller, Get, Post, Put, Delete, Body, UseGuards, Req, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BillingService } from './billing.service';
import { SubscriptionService } from './subscription.service';

@Controller('billing')
export class BillingController {
  constructor(
    private billingService: BillingService,
    private subscriptionService: SubscriptionService,
  ) {}

  @Get('test')
  async test() {
    return { message: 'Billing controller is working!' };
  }

  @Get('plans')
  async getPlans() {
    return this.billingService.getPlans();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getCurrentSubscription(@Req() req: any) {
    return this.billingService.getCurrentSubscription(req.user.tenantId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('limits')
  async getPlanLimits(@Req() req: any) {
    return this.billingService.getPlanLimits(req.user.tenantId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('subscribe')
  async createSubscription(@Req() req: any, @Body() data: { planId: string; paymentMethodId?: string }) {
    try {
      return await this.subscriptionService.createSubscription({
        tenantId: req.user.tenantId,
        planId: data.planId,
        paymentMethodId: data.paymentMethodId,
      });
    } catch (error) {
      console.error('Subscription creation error:', error);
      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('subscription')
  async updateSubscription(@Req() req: any, @Body() data: { planId: string; effectiveDate?: Date }) {
    return this.subscriptionService.updateSubscription(req.user.tenantId, data);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('subscription')
  async cancelSubscription(@Req() req: any) {
    return this.subscriptionService.cancelSubscription(req.user.tenantId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('subscription/history')
  async getSubscriptionHistory(@Req() req: any) {
    return this.subscriptionService.getSubscriptionHistory(req.user.tenantId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('invoices')
  async getInvoices(@Req() req: any) {
    return this.billingService.getInvoices(req.user.tenantId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('payment-methods')
  async addPaymentMethod(@Req() req: any, @Body() data: any) {
    // Implementation for adding payment methods
    return { message: 'Payment method added successfully' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('payment-methods')
  async getPaymentMethods(@Req() req: any) {
    // Implementation for getting payment methods
    return [];
  }
} 