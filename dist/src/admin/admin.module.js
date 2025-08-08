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
const prisma_service_1 = require("../prisma.service");
const superadmin_guard_1 = require("./superadmin.guard");
const configuration_controller_1 = require("./configuration.controller");
const configuration_service_1 = require("../config/configuration.service");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        controllers: [admin_controller_1.AdminController, configuration_controller_1.ConfigurationController],
        providers: [admin_service_1.AdminService, prisma_service_1.PrismaService, superadmin_guard_1.SuperadminGuard, configuration_service_1.ConfigurationService],
        exports: [admin_service_1.AdminService, configuration_service_1.ConfigurationService],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map