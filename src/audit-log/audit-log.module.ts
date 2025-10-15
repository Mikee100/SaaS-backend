import { Module } from '@nestjs/common';
import { AuditLogController } from '../audit-log.controller';
import { AuditLogService } from '../audit-log.service';
import { PrismaModule } from '../prisma.module';
import { UserModule } from '../user/user.module';
import { TrialGuard } from '../auth/trial.guard';
import { SubscriptionService } from '../billing/subscription.service';
import { BillingService } from '../billing/billing.service';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [AuditLogController],
  providers: [AuditLogService, TrialGuard, SubscriptionService, BillingService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
