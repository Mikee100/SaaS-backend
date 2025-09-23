"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const billing_service_1 = require("./billing.service");
let PlanGuard = class PlanGuard {
    reflector;
    billingService;
    constructor(reflector, billingService) {
        this.reflector = reflector;
        this.billingService = billingService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            return false;
        }
        const requiredPlan = undefined;
        const requiredFeature = undefined;
        if (requiredPlan) {
            const currentPlan = user.plan?.name || 'Basic';
            const planHierarchy = { 'Basic': 1, 'Pro': 2, 'Enterprise': 3 };
            const currentPlanLevel = planHierarchy[currentPlan] || 0;
            const requiredPlanLevel = planHierarchy[requiredPlan] || 0;
            return currentPlanLevel >= requiredPlanLevel;
        }
        if (requiredFeature) {
            return await this.billingService.hasFeature(user.tenantId, requiredFeature);
        }
        return true;
    }
};
exports.PlanGuard = PlanGuard;
exports.PlanGuard = PlanGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        billing_service_1.BillingService])
], PlanGuard);
//# sourceMappingURL=plan.guard.js.map