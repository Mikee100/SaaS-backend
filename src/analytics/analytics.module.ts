import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { BillingModule } from '../billing/billing.module';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [BillingModule, PrismaModule],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {} 