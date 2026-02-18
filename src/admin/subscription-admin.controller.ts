import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  NotFoundException,
  Post,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SubscriptionAdminService } from './subscription-admin.service';
import { SuperadminGuard } from './superadmin.guard';
import { TrialGuard } from '../auth/trial.guard';

@Controller('admin/subscriptions')
@UseGuards(AuthGuard('jwt'), SuperadminGuard, TrialGuard)
export class SubscriptionAdminController {
  private readonly logger = new Logger(SubscriptionAdminController.name);

  constructor(
    private readonly subscriptionAdminService: SubscriptionAdminService,
  ) {}

  @Get()
  async getAllSubscriptions() {
    try {
      this.logger.log('Getting all subscriptions');
      const subscriptions = await this.subscriptionAdminService.getAllSubscriptions();
      this.logger.log(`Returning ${subscriptions.length} subscriptions`);
      return subscriptions;
    } catch (error) {
      this.logger.error('Error in getAllSubscriptions:', error);
      throw error;
    }
  }

  @Get('tenant/:tenantId/usage')
  async getTenantUsage(@Param('tenantId') tenantId: string) {
    return this.subscriptionAdminService.getTenantUsage(tenantId);
  }

  @Get(':id')
  async getSubscriptionById(@Param('id') id: string) {
    return this.subscriptionAdminService.getSubscriptionById(id);
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
    return this.subscriptionAdminService.forceSubscriptionUpdate(
      tenantId,
      planId,
    );
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
