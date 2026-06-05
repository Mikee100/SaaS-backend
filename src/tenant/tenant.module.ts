import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { LogoService } from './logo.service';
import { TenantController } from './tenant.controller';
import { UserModule } from '../user/user.module';
import { BranchModule } from '../branch/branch.module';
import { TrialGuard } from '../auth/trial.guard';
import { SubscriptionService } from '../billing/subscription.service';
import { BillingService } from '../billing/billing.service';
import { TenantConfigurationModule } from './tenant-configuration.module';
import { ClassificationModule } from '../classification/classification.module';

@Module({
  imports: [
    UserModule,
    BranchModule,
    TenantConfigurationModule,
    ClassificationModule,
  ],
  providers: [
    TenantService,
    LogoService,
    TrialGuard,
    SubscriptionService,
    BillingService,
  ],
  controllers: [TenantController],
  exports: [TenantService],
})
export class TenantModule {}
