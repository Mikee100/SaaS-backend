import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [BillingModule],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {} 