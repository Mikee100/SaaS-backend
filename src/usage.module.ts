import { Module } from '@nestjs/common';
import { UsageController } from './usage.controller';
import { PrismaService } from './prisma.service';
import { TrialGuard } from './auth/trial.guard';
import { SubscriptionService } from './billing/subscription.service';
import { BillingService } from './billing/billing.service';

@Module({
  controllers: [UsageController],
  providers: [PrismaService, TrialGuard, SubscriptionService, BillingService],
})
export class UsageModule {}
