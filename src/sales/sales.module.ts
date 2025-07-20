import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';
import { RealtimeModule } from '../realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [SalesController],
  providers: [SalesService, PrismaService, AuditLogService],
  exports: [SalesService],
})
export class SalesModule {} 