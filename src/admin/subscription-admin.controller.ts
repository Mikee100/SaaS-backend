import { Controller, Get, Param, Patch, Body, NotFoundException, Post } from '@nestjs/common';
import { SubscriptionAdminService } from './subscription-admin.service';

@Controller('admin/subscriptions')
export class SubscriptionAdminController {
  constructor(private readonly subscriptionAdminService: SubscriptionAdminService) {}

  @Get()
  async getAllSubscriptions() {
    return this.subscriptionAdminService.getAllSubscriptions();
  }

  @Get(':id')
  async getSubscriptionById(@Param('id') id: string) {
    return this.subscriptionAdminService.getSubscriptionById(id);
  }

  @Get('tenant/:tenantId/usage')
  async getTenantUsage(@Param('tenantId') tenantId: string) {
    return this.subscriptionAdminService.getTenantUsage(tenantId);
  }

  @Patch(':id/cancel-scheduled')
  async cancelScheduledChange(@Param('id') id: string) {
    return this.subscriptionAdminService.cancelScheduledChange(id);
  }

  @Patch('tenant/:tenantId/force-update')
  async forceSubscriptionUpdate(
    @Param('tenantId') tenantId: string,
    @Body('planId') planId: string,
  ) {
    if (!planId) {
      throw new NotFoundException('Plan ID is required');
    }
    return this.subscriptionAdminService.forceSubscriptionUpdate(tenantId, planId);
  }

  @Post('assign-plan')
  async assignPlanToTenant(
    @Body('tenantId') tenantId: string,
    @Body('planId') planId: string,
  ) {
    if (!tenantId || !planId) {
      throw new NotFoundException('Tenant ID and Plan ID are required');
    }
    return this.subscriptionAdminService.assignPlanToTenant(tenantId, planId);
  }
}
