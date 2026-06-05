import {
  BadRequestException,
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedRequest } from '../auth/request.types';

@UseGuards(AuthGuard('jwt'))
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  private getTenantId(req: AuthenticatedRequest): string {
    if (!req.user?.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return req.user.tenantId;
  }

  @Get('current')
  async getCurrentSubscription(@Req() req: AuthenticatedRequest) {
    return await this.subscriptionService.getCurrentSubscription(
      this.getTenantId(req),
    );
  }

  @Post('upgrade')
  async upgradeSubscription(
    @Body() body: { planId: string; effectiveDate?: Date },
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.subscriptionService.upgradeSubscription(
      this.getTenantId(req),
      body.planId,
      body.effectiveDate,
    );
  }

  @Post('cancel')
  async cancelSubscription(@Req() req: AuthenticatedRequest) {
    return await this.subscriptionService.cancelSubscription(
      this.getTenantId(req),
    );
  }

  @Post('resume')
  async resumeSubscription(@Req() req: AuthenticatedRequest) {
    return await this.subscriptionService.resumeSubscription(
      this.getTenantId(req),
    );
  }

  @Get('plans')
  async getPlans() {
    return await this.subscriptionService.getPlans();
  }

  @Get('invoices')
  async getInvoices(@Req() req: AuthenticatedRequest) {
    return await this.subscriptionService.getInvoices(this.getTenantId(req));
  }

  // Admin endpoints
  @Post('create')
  async createSubscription(
    @Body() body: { planId: string; paymentMethodId?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.subscriptionService.createSubscription({
      tenantId: this.getTenantId(req),
      userId: req.user.userId || undefined,
      planId: body.planId,
      paymentMethodId: body.paymentMethodId,
    });
  }

  @Post('update')
  async updateSubscription(
    @Body() body: { planId: string; effectiveDate?: Date },
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.subscriptionService.updateSubscription(
      this.getTenantId(req),
      body,
    );
  }

  @Get('history')
  async getSubscriptionHistory(@Req() req: AuthenticatedRequest) {
    return await this.subscriptionService.getSubscriptionHistory(
      this.getTenantId(req),
    );
  }
}
