"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminTenantStatsModule = void 0;
const common_1 = require("@nestjs/common");
const admin_tenant_stats_controller_1 = require("./admin-tenant-stats.controller");
const admin_tenant_stats_service_1 = require("./admin-tenant-stats.service");
const prisma_module_1 = require("../prisma.module");
let AdminTenantStatsModule = class AdminTenantStatsModule {
};
exports.AdminTenantStatsModule = AdminTenantStatsModule;
exports.AdminTenantStatsModule = AdminTenantStatsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [admin_tenant_stats_controller_1.AdminTenantStatsController],
        providers: [admin_tenant_stats_service_1.AdminTenantStatsService],
    })
], AdminTenantStatsModule);
//# sourceMappingURL=admin-tenant-stats.module.js.map