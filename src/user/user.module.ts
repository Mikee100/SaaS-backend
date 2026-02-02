import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AuditLogService } from '../audit-log.service';
import { TrialGuard } from '../auth/trial.guard';
import { SubscriptionService } from '../billing/subscription.service';
import { BillingService } from '../billing/billing.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  providers: [
    UserService,
    AuditLogService,
    TrialGuard,
    SubscriptionService,
    BillingService,
  ],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
