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
} 