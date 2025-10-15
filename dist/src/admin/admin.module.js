"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const admin_controller_1 = require("./admin.controller");
const admin_service_1 = require("./admin.service");
const superadmin_guard_1 = require("./superadmin.guard");
const configuration_controller_1 = require("./configuration.controller");
const subscription_admin_controller_1 = require("./subscription-admin.controller");
const subscription_admin_service_1 = require("./subscription-admin.service");
const configuration_service_1 = require("../config/configuration.service");
const billing_module_1 = require("../billing/billing.module");
const admin_tenant_stats_module_1 = require("../adminTenantStats/admin-tenant-stats.module");
const trial_guard_1 = require("../auth/trial.guard");
const tenant_service_1 = require("../tenant/tenant.service");
const user_service_1 = require("../user/user.service");
const branch_service_1 = require("../branch/branch.service");
const audit_log_service_1 = require("../audit-log.service");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [billing_module_1.BillingModule, admin_tenant_stats_module_1.AdminTenantStatsModule],
        controllers: [admin_controller_1.AdminController, configuration_controller_1.ConfigurationController, subscription_admin_controller_1.SubscriptionAdminController],
        providers: [
            admin_service_1.AdminService,
            superadmin_guard_1.SuperadminGuard,
            subscription_admin_service_1.SubscriptionAdminService,
            configuration_service_1.ConfigurationService,
            trial_guard_1.TrialGuard,
            tenant_service_1.TenantService,
            user_service_1.UserService,
            branch_service_1.BranchService,
            audit_log_service_1.AuditLogService,
        ],
        exports: [admin_service_1.AdminService, configuration_service_1.ConfigurationService],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map