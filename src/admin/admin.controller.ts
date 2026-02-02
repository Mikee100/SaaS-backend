import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Logger,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { SuperadminGuard } from './superadmin.guard';
import { SubscriptionService } from '../billing/subscription.service';
import { TrialGuard } from '../auth/trial.guard';
import { AuditLogService } from '../audit-log.service';
import { AuthService } from '../auth/auth.services';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), SuperadminGuard, TrialGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly subscriptionService: SubscriptionService,
    private readonly auditLogService: AuditLogService,
    private readonly authService: AuthService,
  ) {}

  @Get('stats')
  async getPlatformStats() {
    this.logger.log('AdminController: getPlatformStats called');
    return this.adminService.getPlatformStats();
  }

  @Get('stats/revenue-history')
  async getRevenueHistory(
    @Query('months') months?: string,
  ) {
    this.logger.log('AdminController: getRevenueHistory called');
    const monthsNum = months ? Number(months) : 12;
    return this.adminService.getRevenueHistory(monthsNum);
  }

  @Get('stats/tenant-growth')
  async getTenantGrowth(
    @Query('months') months?: string,
  ) {
    this.logger.log('AdminController: getTenantGrowth called');
    const monthsNum = months ? Number(months) : 12;
    return this.adminService.getTenantGrowth(monthsNum);
  }

  @Get('billing/metrics')
  async getBillingMetrics() {
    this.logger.log('AdminController: getBillingMetrics called');
    return this.adminService.getBillingMetrics();
  }

  @Get('billing/subscriptions')
  async getAllSubscriptions() {
    this.logger.log('AdminController: getAllSubscriptions called');
    return this.adminService.getAllSubscriptions();
  }

  @Get('tenants')
  async getAllTenants() {
    this.logger.log('AdminController: getAllTenants called');
    const result = await this.adminService.getAllTenants();
    this.logger.log(
      `AdminController: getAllTenants returning ${result.length} tenants`,
    );
    return result;
  }

  // Specific routes must be defined BEFORE parameterized routes
  @Get('tenants/space-usage')
  async getTenantsSpaceUsage() {
    this.logger.log('AdminController: getTenantsSpaceUsage called');
    return this.adminService.getTenantsSpaceUsage();
  }

  @Get('tenants/analytics')
  async getTenantsAnalytics() {
    this.logger.log('AdminController: getTenantsAnalytics called');
    const stats = await this.adminService.getTenantsSpaceUsage();
    return stats;
  }

  @Get('tenants/:id')
  async getTenantById(@Param('id') tenantId: string) {
    this.logger.log(
      `AdminController: getTenantById called with tenantId: ${tenantId}`,
    );
    return this.adminService.getTenantById(tenantId);
  }

  @Get('tenants/:id/products')
  async getTenantProducts(@Param('id') tenantId: string) {
    this.logger.log(
      `AdminController: getTenantProducts called with tenantId: ${tenantId}`,
    );
    return this.adminService.getTenantProducts(tenantId);
  }

  @Get('tenants/:id/transactions')
  async getTenantTransactions(@Param('id') tenantId: string) {
    this.logger.log(
      `AdminController: getTenantTransactions called with tenantId: ${tenantId}`,
    );
    return this.adminService.getTenantTransactions(tenantId);
  }

  @Post('tenants/:id/switch')
  async switchToTenant(@Param('id') tenantId: string) {
    this.logger.log(
      `AdminController: switchToTenant called with tenantId: ${tenantId}`,
    );
    return this.adminService.switchToTenant(tenantId);
  }

  @Post('trials')
  async createTrial(
    @Body() body: { tenantId: string; durationHours: number; planId: string },
  ) {
    this.logger.log(
      `AdminController: createTrial called for tenant: ${body.tenantId}`,
    );
    return this.subscriptionService.createTrialSubscription(
      body.tenantId,
      body.durationHours,
      body.planId,
    );
  }

  @Get('trials/:tenantId')
  async getTrialStatus(@Param('tenantId') tenantId: string) {
    this.logger.log(
      `AdminController: getTrialStatus called for tenant: ${tenantId}`,
    );
    return this.subscriptionService.checkTrialStatus(tenantId);
  }

  // Plan Management Endpoints
  @Get('plans')
  async getAllPlans() {
    this.logger.log('AdminController: getAllPlans called');
    return this.adminService.getAllPlans();
  }

  @Get('plans/:id')
  async getPlanById(@Param('id') planId: string) {
    this.logger.log(
      `AdminController: getPlanById called with planId: ${planId}`,
    );
    return this.adminService.getPlanById(planId);
  }

  @Post('plans')
  async createPlan(@Body() planData: any) {
    this.logger.log('AdminController: createPlan called');
    return this.adminService.createPlan(planData);
  }

  @Put('plans/:id')
  async updatePlan(@Param('id') planId: string, @Body() planData: any) {
    this.logger.log(
      `AdminController: updatePlan called with planId: ${planId}`,
    );
    return this.adminService.updatePlan(planId, planData);
  }

  @Delete('plans/:id')
  async deletePlan(@Param('id') planId: string) {
    this.logger.log(
      `AdminController: deletePlan called with planId: ${planId}`,
    );
    return this.adminService.deletePlan(planId);
  }

  @Get('plan-features')
  async getAllPlanFeatures() {
    this.logger.log('AdminController: getAllPlanFeatures called');
    return this.adminService.getAllPlanFeatures();
  }

  @Post('tenants')
  async createTenant(@Body() tenantData: any) {
    this.logger.log('AdminController: createTenant called');
    return this.adminService.createTenant(tenantData);
  }

  @Delete('tenants/:id')
  async deleteTenant(@Param('id') tenantId: string) {
    this.logger.log(
      `AdminController: deleteTenant called with tenantId: ${tenantId}`,
    );
    return this.adminService.deleteTenant(tenantId);
  }

  @Get('users')
  async getAllUsers() {
    this.logger.log('AdminController: getAllUsers called');
    return this.adminService.getAllUsers();
  }

  @Put('users/:id/status')
  async updateUserStatus(
    @Param('id') userId: string,
    @Body() body: { isDisabled: boolean },
  ) {
    this.logger.log(
      `AdminController: updateUserStatus called for userId: ${userId}, isDisabled: ${body.isDisabled}`,
    );
    return this.adminService.updateUserStatus(userId, body.isDisabled);
  }

  @Put('users/:id/role')
  async updateUserRole(
    @Param('id') userId: string,
    @Body() body: { roleId: string; tenantId?: string },
  ) {
    this.logger.log(
      `AdminController: updateUserRole called for userId: ${userId}, roleId: ${body.roleId}`,
    );
    return this.adminService.updateUserRole(userId, body.roleId, body.tenantId);
  }

  @Post('users/:id/logout-all')
  async logoutAllSessions(@Param('id') userId: string) {
    this.logger.log(
      `AdminController: logout-all called for userId: ${userId}`,
    );
    const count = await this.authService.revokeAllSessionsForUser(userId);
    return { revoked: count };
  }

  @Get('users/:id/activity')
  async getUserActivity(
    @Param('id') userId: string,
    @Query('limit') limit: string,
  ) {
    this.logger.log(`AdminController: getUserActivity called for userId: ${userId}`);
    const limitNum = limit ? Number(limit) : 50;
    return this.adminService.getUserActivity(userId, limitNum);
  }

  @Get('logs')
  async getAuditLogs(
    @Query('limit') limit: string,
    @Query('tenantId') tenantId?: string,
  ) {
    this.logger.log('AdminController: getAuditLogs called');
    const limitNum = limit ? Number(limit) : 100;
    return this.auditLogService.getLogs(limitNum, tenantId);
  }
}
