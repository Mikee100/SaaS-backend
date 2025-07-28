"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingModule = void 0;
const common_1 = require("@nestjs/common");
const billing_controller_1 = require("./billing.controller");
const billing_service_1 = require("./billing.service");
const subscription_service_1 = require("./subscription.service");
const prisma_module_1 = require("../prisma.module");
const plan_guard_1 = require("./plan.guard");
let BillingModule = class BillingModule {
};
exports.BillingModule = BillingModule;
exports.BillingModule = BillingModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [billing_controller_1.BillingController],
        providers: [billing_service_1.BillingService, subscription_service_1.SubscriptionService, plan_guard_1.PlanGuard],
        exports: [billing_service_1.BillingService, subscription_service_1.SubscriptionService, plan_guard_1.PlanGuard],
    })
], BillingModule);
//# sourceMappingURL=billing.module.js.map