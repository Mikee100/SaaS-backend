import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req, Put, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { SuperadminGuard } from './superadmin.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('test')
  async testEndpoint() {
    return { message: 'Admin endpoint is working' };
  }

  @Get('test/analytics')
  async testAnalytics() {
    console.log('testAnalytics called');
    const result = await this.adminService.getTenantAnalytics();
    console.log('testAnalytics result:', result);
    return result;
  }

  @Get('test/comparison')
  async testComparison() {
    console.log('testComparison called');
    const result = await this.adminService.getTenantComparison();
    console.log('testComparison result:', result);
    return result;
  }

  @Get('test/backups')
  async testBackups() {
    console.log('testBackups called');
    const result = await this.adminService.getTenantBackups();
    console.log('testBackups result:', result);
    return result;
  }

  @Get('test/migrations')
  async testMigrations() {
    console.log('testMigrations called');
    const result = await this.adminService.getTenantMigrations();
    console.log('testMigrations result:', result);
    return result;
  }

  @Get('tenants')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async getAllTenants() {
    return this.adminService.getAllTenants();
  }

  @Get('users')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async getPlatformStats() {
    return this.adminService.getPlatformStats();
  }

  @Get('logs')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async getPlatformLogs() {
    return this.adminService.getPlatformLogs();
  }

  @Get('health')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get('health/metrics')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async getPerformanceMetrics() {
    return this.adminService.getPerformanceMetrics();
  }

  @Get('health/metrics/realtime')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async getRealTimeMetrics() {
    return this.adminService.getRealTimeMetrics();
  }

  @Get('support/tickets')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async getSupportTickets(@Query('status') status?: string, @Query('priority') priority?: string) {
    return this.adminService.getSupportTickets(status, priority);
  }

  @Get('support/tickets/:id')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async getSupportTicket(@Param('id') id: string) {
    return this.adminService.getSupportTicket(id);
  }

  @Get('support/tickets/:id/responses')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async getTicketResponses(@Param('id') id: string) {
    return this.adminService.getTicketResponses(id);
  }

  @Post('support/tickets/:id/responses')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async addTicketResponse(@Param('id') id: string, @Body() responseData: any, @Req() req: any) {
    return this.adminService.addTicketResponse(id, responseData, req.user);
  }

  @Put('support/tickets/:id')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async updateTicket(@Param('id') id: string, @Body() updateData: any) {
    return this.adminService.updateTicket(id, updateData);
  }

  @Get('bulk/operations')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async getBulkOperations() {
    return this.adminService.getBulkOperations();
  }

  @Post('bulk/execute')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async executeBulkAction(@Body() actionData: any, @Req() req: any) {
    return this.adminService.executeBulkAction(actionData, req.user);
  }

  @Post('tenants')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async createTenant(@Body() tenantData: any) {
    return this.adminService.createTenant(tenantData);
  }

  @Delete('tenants/:id')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async deleteTenant(@Param('id') id: string) {
    return this.adminService.deleteTenant(id);
  }

  @Get('tenants/:id')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async getTenantById(@Param('id') id: string) {
    return this.adminService.getTenantById(id);
  }

  @Get('tenants/analytics')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async getTenantAnalytics(@Query('timeRange') timeRange?: string) {
    console.log('=== getTenantAnalytics called ===');
    console.log('timeRange:', timeRange);
    console.log('User authenticated as superadmin');
    
    try {
      const result = await this.adminService.getTenantAnalytics();
      console.log('getTenantAnalytics result length:', result?.length);
      console.log('getTenantAnalytics result type:', typeof result);
      console.log('getTenantAnalytics result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('Error in getTenantAnalytics:', error);
      throw error;
    }
  }

  @Get('tenants/comparison')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async getTenantComparison() {
    console.log('getTenantComparison called');
    const result = await this.adminService.getTenantComparison();
    console.log('getTenantComparison result:', result);
    return result;
  }

  @Get('tenants/backups')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async getTenantBackups() {
    return this.adminService.getTenantBackups();
  }

  @Post('tenants/backups')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async createTenantBackup(@Body() backupData: any) {
    return this.adminService.createTenantBackup(backupData);
  }

  @Post('tenants/restore')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async restoreTenantBackup(@Body() restoreData: any) {
    return this.adminService.restoreTenantBackup(restoreData);
  }

  @Get('tenants/migrations')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async getTenantMigrations() {
    return this.adminService.getTenantMigrations();
  }

  @Post('tenants/migrate')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async migrateTenant(@Body() migrationData: any) {
    return this.adminService.migrateTenant(migrationData);
  }

  @Get('tenants/resources')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async getTenantResources() {
    return this.adminService.getTenantResources();
  }

  @Get('tenants/plans')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async getTenantPlans() {
    return this.adminService.getTenantPlans();
  }

  @Put('tenants/:id/plan')
  @UseGuards(AuthGuard('jwt'), SuperadminGuard)
  async updateTenantPlan(@Param('id') id: string, @Body() planData: any) {
    return this.adminService.updateTenantPlan(id, planData);
  }
} 