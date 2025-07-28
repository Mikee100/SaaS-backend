import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { SubscriptionService } from './subscription.service';
import { PrismaModule } from '../prisma.module';
import { PlanGuard } from './plan.guard';

@Module({
  imports: [PrismaModule],
  controllers: [BillingController],
  providers: [BillingService, SubscriptionService, PlanGuard],
  exports: [BillingService, SubscriptionService, PlanGuard],
})
export class BillingModule {} 