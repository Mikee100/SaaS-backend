import { Module } from '@nestjs/common';
import { TenantConfigurationController } from './tenant-configuration.controller';
import { TenantConfigurationService } from '../config/tenant-configuration.service';
import { UserModule } from '../user/user.module';
import { TrialGuard } from '../auth/trial.guard';
import { SubscriptionService } from '../billing/subscription.service';
import { BillingService } from '../billing/billing.service';
import { CacheModule } from '../cache/cache.module';
import { AuditLogService } from '../audit-log.service';
import { BlueprintManifestService } from '../blueprints/blueprint-manifest.service';
import { BlueprintMigrationHelperService } from '../blueprints/blueprint-migration-helper.service';

@Module({
  imports: [UserModule, CacheModule],
  providers: [
    TenantConfigurationService,
    TrialGuard,
    SubscriptionService,
    BillingService,
    AuditLogService,
    BlueprintManifestService,
    BlueprintMigrationHelperService,
  ],
  controllers: [TenantConfigurationController],
  exports: [
    TenantConfigurationService,
    BlueprintManifestService,
    BlueprintMigrationHelperService,
  ],
})
export class TenantConfigurationModule {}
