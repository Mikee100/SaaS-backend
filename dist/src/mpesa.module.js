"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MpesaModule = void 0;
const common_1 = require("@nestjs/common");
const mpesa_service_1 = require("./mpesa.service");
const mpesa_controller_1 = require("./mpesa.controller");
const prisma_service_1 = require("./prisma.service");
const sales_module_1 = require("./sales/sales.module");
let MpesaModule = class MpesaModule {
};
exports.MpesaModule = MpesaModule;
exports.MpesaModule = MpesaModule = __decorate([
    (0, common_1.Module)({
        controllers: [mpesa_controller_1.MpesaController],
        providers: [mpesa_service_1.MpesaService, prisma_service_1.PrismaService],
        imports: [sales_module_1.SalesModule],
    })
], MpesaModule);
//# sourceMappingURL=mpesa.module.js.map