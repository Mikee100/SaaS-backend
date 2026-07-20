import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MonitoringService } from './monitoring.service';

@Injectable()
export class MonitoringScheduler {
  private readonly logger = new Logger(MonitoringScheduler.name);

  constructor(private readonly monitoringService: MonitoringService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async recordHealthSnapshot() {
    try {
      await this.monitoringService.performHealthCheck();
    } catch (error) {
      this.logger.error('Scheduled health check failed:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async pruneOldSnapshots() {
    await this.monitoringService.pruneOldSnapshots(30);
  }
}
