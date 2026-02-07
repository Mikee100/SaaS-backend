import { Module } from '@nestjs/common';
import { TenantConfigurationController } from './tenant-configuration.controller';
import { TenantConfigurationService } from '../config/tenant-configuration.service';
import { PrismaService } from '../prisma.service';
import { UserModule } from '../user/user.module';
import { TrialGuard } from '../auth/trial.guard';
import { SubscriptionService } from '../billing/subscription.service';
import { BillingService } from '../billing/billing.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [UserModule, CacheModule],
  providers: [
    TenantConfigurationService,
    PrismaService,
    TrialGuard,
    SubscriptionService,
    BillingService,
  ],
  controllers: [TenantConfigurationController],
  exports: [TenantConfigurationService],
})
export class TenantConfigurationModule {}
