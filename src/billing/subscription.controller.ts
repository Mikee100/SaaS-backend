import { Controller, Post, Get, Body, Req, UseGuards, Param } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post('create')
  async createSubscription(@Body() body: { planId: string; paymentMethodId?: string }, @Req() req) {
    return await this.subscriptionService.createSubscription({
      tenantId: req.user.tenantId,
      planId: body.planId,
      paymentMethodId: body.paymentMethodId,
    });
  }

  @Post('update')
  async updateSubscription(@Body() body: { planId: string; effectiveDate?: Date }, @Req() req) {
    return await this.subscriptionService.updateSubscription(req.user.tenantId, body);
  }

  @Post('cancel')
  async cancelSubscription(@Req() req) {
    return await this.subscriptionService.cancelSubscription(req.user.tenantId);
  }

  @Get('history')
  async getSubscriptionHistory(@Req() req) {
    return await this.subscriptionService.getSubscriptionHistory(req.user.tenantId);
  }
}
