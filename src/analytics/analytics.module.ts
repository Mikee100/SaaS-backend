import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PrismaModule } from '../prisma.module'; // <-- Add this import
import { TrialGuard } from '../auth/trial.guard';
import { SubscriptionService } from '../billing/subscription.service';
import { BillingService } from '../billing/billing.service';

@Module({
  imports: [PrismaModule], // <-- Add PrismaModule here
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    TrialGuard,
    SubscriptionService,
    BillingService,
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
