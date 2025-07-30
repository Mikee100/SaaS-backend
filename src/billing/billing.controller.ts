import { Controller, Get, Post, Put, Delete, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('plans')
  async getPlans() {
    return this.billingService.getPlans();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getCurrentSubscription(@Req() req) {
    return this.billingService.getCurrentSubscription(req.user.tenantId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('limits')
  async getPlanLimits(@Req() req) {
    const limits = await this.billingService.getPlanLimits(req.user.tenantId);
    const subscription = await this.billingService.getCurrentSubscription(req.user.tenantId);
    
    return {
      currentPlan: subscription.plan?.name || 'Basic',
      limits,
      features: {
        analytics: limits.analyticsEnabled,
        advanced_reports: limits.advancedReports,
        priority_support: limits.prioritySupport,
        custom_branding: limits.customBranding,
        api_access: limits.apiAccess,
        bulk_operations: limits.bulkOperations,
        data_export: limits.dataExport,
        custom_fields: limits.customFields,
        advanced_security: limits.advancedSecurity,
        white_label: limits.whiteLabel,
        dedicated_support: limits.dedicatedSupport,
        sso_enabled: limits.ssoEnabled,
        audit_logs: limits.auditLogs,
        backup_restore: limits.backupRestore,
        custom_integrations: limits.customIntegrations,
      }
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('enterprise-features')
  async getEnterpriseFeatures(@Req() req) {
    return this.billingService.getEnterpriseFeatures(req.user.tenantId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('subscribe')
  async createSubscription(@Req() req, @Body() body: { planId: string }) {
    // Mock implementation - in real app, this would integrate with payment processor
    return {
      success: true,
      message: 'Subscription created successfully',
      planId: body.planId
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('subscription')
  async updateSubscription(@Req() req, @Body() body: { planId: string }) {
    // Mock implementation - in real app, this would update subscription
    return {
      success: true,
      message: 'Subscription updated successfully',
      planId: body.planId
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('subscription')
  async cancelSubscription(@Req() req) {
    // Mock implementation - in real app, this would cancel subscription
    return {
      success: true,
      message: 'Subscription cancelled successfully'
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('invoices')
  async getInvoices(@Req() req) {
    return this.billingService.getInvoices(req.user.tenantId);
  }
} 