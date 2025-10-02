"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma.module");
const config_1 = require("@nestjs/config");
const auth_module_1 = require("./auth/auth.module");
const user_module_1 = require("./user/user.module");
const product_module_1 = require("./product/product.module");
const sales_module_1 = require("./sales/sales.module");
const tenant_module_1 = require("./tenant/tenant.module");
const tenant_configuration_module_1 = require("./tenant/tenant-configuration.module");
const inventory_module_1 = require("./inventory/inventory.module");
const mpesa_module_1 = require("./mpesa/mpesa.module");
const realtime_module_1 = require("./realtime.module");
const permission_module_1 = require("./permission/permission.module");
const billing_module_1 = require("./billing/billing.module");
const analytics_module_1 = require("./analytics/analytics.module");
const branch_module_1 = require("./branch/branch.module");
const usage_module_1 = require("./usage.module");
const admin_tenant_stats_module_1 = require("./adminTenantStats/admin-tenant-stats.module");
const throttler_1 = require("@nestjs/throttler");
const audit_log_module_1 = require("./audit-log/audit-log.module");
const supplier_module_1 = require("./supplier/supplier.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            throttler_1.ThrottlerModule.forRoot([{
                    ttl: 60,
                    limit: 5,
                }]),
            auth_module_1.AuthModule,
            config_1.ConfigModule.forRoot(),
            prisma_module_1.PrismaModule,
            user_module_1.UserModule,
            product_module_1.ProductModule,
            sales_module_1.SalesModule,
            tenant_module_1.TenantModule,
            tenant_configuration_module_1.TenantConfigurationModule,
            inventory_module_1.InventoryModule,
            mpesa_module_1.MpesaModule,
            realtime_module_1.RealtimeModule,
            permission_module_1.PermissionModule,
            billing_module_1.BillingModule,
            analytics_module_1.AnalyticsModule,
            branch_module_1.BranchModule,
            usage_module_1.UsageModule,
            admin_tenant_stats_module_1.AdminTenantStatsModule,
            audit_log_module_1.AuditLogModule,
            supplier_module_1.SupplierModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map