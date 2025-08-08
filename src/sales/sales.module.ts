import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';
import { RealtimeModule } from '../realtime.module';
import { UserModule } from '../user/user.module';
import { ConfigurationService } from '../config/configuration.service';

@Module({
  imports: [RealtimeModule, UserModule],
  controllers: [SalesController],
  providers: [SalesService, PrismaService, AuditLogService, ConfigurationService],
  exports: [SalesService],
})
export class SalesModule {} 