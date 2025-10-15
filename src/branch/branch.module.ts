import { Module } from '@nestjs/common';
import { BranchController } from './branch.controller';
import { BranchService } from './branch.service';
import { PrismaService } from '../prisma.service';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { TrialGuard } from '../auth/trial.guard';
import { SubscriptionService } from '../billing/subscription.service';
import { BillingService } from '../billing/billing.service';

@Module({
  imports: [UserModule, AuthModule],
  controllers: [BranchController],
  providers: [BranchService, PrismaService, TrialGuard, SubscriptionService, BillingService],
  exports: [BranchService],
})
export class BranchModule {}
