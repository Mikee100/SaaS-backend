import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';
import { RealtimeModule } from '../realtime.module';
import { UserModule } from '../user/user.module';
import { TrialGuard } from '../auth/trial.guard';
import { SubscriptionService } from '../billing/subscription.service';
import { BillingService } from '../billing/billing.service';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, PrismaService, AuditLogService, TrialGuard, SubscriptionService, BillingService],
  imports: [RealtimeModule, UserModule],
})
export class InventoryModule {}
