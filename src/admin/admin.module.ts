import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SuperadminGuard } from './superadmin.guard';
import { ConfigurationController } from './configuration.controller';
import { SubscriptionAdminController } from './subscription-admin.controller';
import { SubscriptionAdminService } from './subscription-admin.service';
import { ConfigurationService } from '../config/configuration.service';
import { BillingModule } from '../billing/billing.module';
import { AdminTenantStatsModule } from '../adminTenantStats/admin-tenant-stats.module';
import { TrialGuard } from '../auth/trial.guard';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { TenantService } from '../tenant/tenant.service';
import { BranchService } from '../branch/branch.service';
import { AuditLogService } from '../audit-log.service';
import { TenantConfigurationModule } from '../tenant/tenant-configuration.module';

@Module({
  imports: [
    BillingModule,
    AdminTenantStatsModule,
    AuthModule,
    UserModule,
    TenantConfigurationModule,
  ],
  controllers: [
    AdminController,
    ConfigurationController,
    SubscriptionAdminController,
  ],
  providers: [
    AdminService,
    SuperadminGuard,
    SubscriptionAdminService,
    ConfigurationService,
    TrialGuard,
    TenantService,
    BranchService,
    AuditLogService,
  ],
  exports: [AdminService, ConfigurationService],
})
export class AdminModule {}
