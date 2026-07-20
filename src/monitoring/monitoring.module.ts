import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { MonitoringScheduler } from './monitoring.scheduler';
import { PrismaModule } from '../prisma.module';
import { EmailModule } from '../email/email.module';
import { BackupModule } from '../backup/backup.module';

@Module({
  imports: [PrismaModule, EmailModule, BackupModule],
  controllers: [MonitoringController],
  providers: [MonitoringService, MonitoringScheduler],
  exports: [MonitoringService],
})
export class MonitoringModule {}
