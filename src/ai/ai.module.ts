import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma.service';
import { UserModule } from '../user/user.module';
import { TrialGuard } from '../auth/trial.guard';
import { SubscriptionService } from '../billing/subscription.service';
import { BillingService } from '../billing/billing.service';
import { BackupModule } from '../backup/backup.module';

@Module({
  imports: [UserModule, BackupModule],
  controllers: [AiController],
  providers: [
    AiService,
    PrismaService,
    TrialGuard,
    SubscriptionService,
    BillingService,
  ],
})
export class AiModule {}
