import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { LogoService } from './logo.service';
import { TenantController } from './tenant.controller';
import { PrismaService } from '../prisma.service';
import { UserModule } from '../user/user.module';
import { BranchModule } from '../branch/branch.module';
import { TrialGuard } from '../auth/trial.guard';
import { SubscriptionService } from '../billing/subscription.service';
import { BillingService } from '../billing/billing.service';

@Module({
  imports: [UserModule, BranchModule],
  providers: [TenantService, PrismaService, LogoService, TrialGuard, SubscriptionService, BillingService],
  controllers: [TenantController],
})
export class TenantModule {}
