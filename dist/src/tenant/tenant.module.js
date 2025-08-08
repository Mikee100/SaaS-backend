"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantModule = void 0;
const common_1 = require("@nestjs/common");
const tenant_service_1 = require("./tenant.service");
const tenant_controller_1 = require("./tenant.controller");
const tenant_configuration_controller_1 = require("./tenant-configuration.controller");
const tenant_configuration_service_1 = require("../config/tenant-configuration.service");
const logo_service_1 = require("./logo.service");
const prisma_service_1 = require("../prisma.service");
const user_module_1 = require("../user/user.module");
let TenantModule = class TenantModule {
};
exports.TenantModule = TenantModule;
exports.TenantModule = TenantModule = __decorate([
    (0, common_1.Module)({
        imports: [user_module_1.UserModule],
        providers: [tenant_service_1.TenantService, tenant_configuration_service_1.TenantConfigurationService, logo_service_1.LogoService, prisma_service_1.PrismaService],
        controllers: [tenant_controller_1.TenantController, tenant_configuration_controller_1.TenantConfigurationController],
        exports: [logo_service_1.LogoService]
    })
], TenantModule);
//# sourceMappingURL=tenant.module.js.map