import { Controller, Get, Post, Put, Param, Body, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SuperadminGuard } from '../admin/superadmin.guard';
import { MonitoringService } from './monitoring.service';

@Controller('admin/monitoring')
@UseGuards(AuthGuard('jwt'), SuperadminGuard)
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('health')
  async getHealthCheck() {
    return this.monitoringService.performHealthCheck();
  }

  @Get('health/history')
  async getHealthHistory(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit) : 50;
    return this.monitoringService.getHealthHistory(limitNum);
  }

  @Get('database/metrics')
  async getDatabaseMetrics() {
    return this.monitoringService.getDatabaseMetrics();
  }

  @Get('system/metrics')
  async getSystemMetrics() {
    return this.monitoringService.getSystemMetrics();
  }

  @Get('alerts')
  async getAlertConfigs() {
    return this.monitoringService.getAlertConfigs();
  }

  @Put('alerts/:alertId')
  async updateAlertConfig(
    @Param('alertId') alertId: string,
    @Body() config: { enabled?: boolean; threshold?: number; notificationChannels?: string[] }
  ) {
    await this.monitoringService.updateAlertConfig(alertId, config);
    return { success: true, message: 'Alert configuration updated' };
  }

  @Post('alerts/test/:alertId')
  async testAlert(@Param('alertId') alertId: string) {
    const alerts = await this.monitoringService.getAlertConfigs();
    const alert = alerts.find(a => a.id === alertId);

    if (!alert) {
      return { success: false, message: 'Alert not found' };
    }

    // Trigger test alert with sample values
    await this.monitoringService['triggerAlert'](alert, 95, 'Test Metric');
    return { success: true, message: 'Test alert sent' };
  }

  @Get('notifications')
  async getNotificationHistory(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit) : 50;
    return this.monitoringService.getNotificationHistory(limitNum);
  }
}
