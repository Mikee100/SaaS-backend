import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  Param,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('current')
  async getCurrentSubscription(@Req() req) {
    return await this.subscriptionService.getCurrentSubscription(
      req.user.tenantId,
    );
  }

  @Post('upgrade')
  async upgradeSubscription(
    @Body() body: { planId: string; effectiveDate?: Date },
    @Req() req,
  ) {
    return await this.subscriptionService.upgradeSubscription(
      req.user.tenantId,
      body.planId,
      body.effectiveDate,
    );
  }

  @Post('cancel')
  async cancelSubscription(@Req() req) {
    return await this.subscriptionService.cancelSubscription(req.user.tenantId);
  }

  @Post('resume')
  async resumeSubscription(@Req() req) {
    return await this.subscriptionService.resumeSubscription(req.user.tenantId);
  }

  @Get('plans')
  async getPlans() {
    return await this.subscriptionService.getPlans();
  }

  @Get('invoices')
  async getInvoices(@Req() req) {
    return await this.subscriptionService.getInvoices(req.user.tenantId);
  }

  // Admin endpoints
  @Post('create')
  async createSubscription(
    @Body() body: { planId: string; paymentMethodId?: string },
    @Req() req,
  ) {
    return await this.subscriptionService.createSubscription({
      tenantId: req.user.tenantId,
      userId: req.user.userId || undefined,
      planId: body.planId,
      paymentMethodId: body.paymentMethodId,
    });
  }

  @Post('update')
  async updateSubscription(
    @Body() body: { planId: string; effectiveDate?: Date },
    @Req() req,
  ) {
    return await this.subscriptionService.updateSubscription(
      req.user.tenantId,
      body,
    );
  }

  @Get('history')
  async getSubscriptionHistory(@Req() req) {
    return await this.subscriptionService.getSubscriptionHistory(
      req.user.tenantId,
    );
  }
}
