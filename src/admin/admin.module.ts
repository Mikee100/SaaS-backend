import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SuperadminGuard } from './superadmin.guard';
import { ConfigurationController } from './configuration.controller';
import { SubscriptionAdminController } from './subscription-admin.controller';
import { SubscriptionAdminService } from './subscription-admin.service';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { BulkController } from './bulk.controller';
import { BulkService } from './bulk.service';
import { ConfigurationService } from '../config/configuration.service';
import { BillingModule } from '../billing/billing.module';
import { AdminTenantStatsModule } from '../adminTenantStats/admin-tenant-stats.module';
import { TrialGuard } from '../auth/trial.guard';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { TenantModule } from '../tenant/tenant.module';
import { BranchService } from '../branch/branch.service';
import { AuditLogService } from '../audit-log.service';
import { TenantConfigurationModule } from '../tenant/tenant-configuration.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { AdminHealthController } from './admin-health.controller';
import { PlatformSettingsController } from './platform-settings.controller';
import { ImpersonationController } from './impersonation.controller';

@Module({
  imports: [
    BillingModule,
    AdminTenantStatsModule,
    AuthModule,
    UserModule,
    TenantModule,
    TenantConfigurationModule,
    MonitoringModule,
  ],
  controllers: [
    AdminController,
    ConfigurationController,
    SubscriptionAdminController,
    SupportController,
    BulkController,
    AdminHealthController,
    PlatformSettingsController,
    ImpersonationController,
  ],
  providers: [
    AdminService,
    SuperadminGuard,
    SubscriptionAdminService,
    SupportService,
    BulkService,
    ConfigurationService,
    TrialGuard,
    BranchService,
    AuditLogService,
  ],
  exports: [AdminService, ConfigurationService],
})
export class AdminModule {}
