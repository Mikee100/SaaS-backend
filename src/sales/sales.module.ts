import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';
import { RealtimeModule } from '../realtime.module';
import { UserModule } from '../user/user.module';
import { ConfigModule } from '../config/config.module';
import { TrialGuard } from '../auth/trial.guard';
import { SubscriptionService } from '../billing/subscription.service';
import { BillingService } from '../billing/billing.service';

import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [
    RealtimeModule,
    UserModule,
    ConfigModule, // Import ConfigModule to provide CONFIG_OPTIONS
    LedgerModule,
  ],
  controllers: [SalesController],
  providers: [
    SalesService,
    PrismaService,
    AuditLogService,
    TrialGuard,
    SubscriptionService,
    BillingService,
  ],
  exports: [SalesService],
})
export class SalesModule {}
