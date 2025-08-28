"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantConfigurationModule = void 0;
const common_1 = require("@nestjs/common");
const tenant_configuration_controller_1 = require("./tenant-configuration.controller");
const tenant_configuration_service_1 = require("../config/tenant-configuration.service");
const prisma_service_1 = require("../prisma.service");
const user_module_1 = require("../user/user.module");
let TenantConfigurationModule = class TenantConfigurationModule {
};
exports.TenantConfigurationModule = TenantConfigurationModule;
exports.TenantConfigurationModule = TenantConfigurationModule = __decorate([
    (0, common_1.Module)({
        imports: [user_module_1.UserModule],
        providers: [tenant_configuration_service_1.TenantConfigurationService, prisma_service_1.PrismaService],
        controllers: [tenant_configuration_controller_1.TenantConfigurationController],
        exports: [tenant_configuration_service_1.TenantConfigurationService]
    })
], TenantConfigurationModule);
//# sourceMappingURL=tenant-configuration.module.js.map