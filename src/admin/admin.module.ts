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
import { TenantService } from '../tenant/tenant.service';
import { UserService } from '../user/user.service';
import { BranchService } from '../branch/branch.service';
import { AuditLogService } from '../audit-log.service';

@Module({
  imports: [BillingModule, AdminTenantStatsModule],
  controllers: [AdminController, ConfigurationController, SubscriptionAdminController],
  providers: [
    AdminService,
    SuperadminGuard,
    SubscriptionAdminService,
    ConfigurationService,
    TrialGuard,
    TenantService,
    UserService,
    BranchService,
    AuditLogService,
  ],
  exports: [AdminService, ConfigurationService],
})
export class AdminModule {}
