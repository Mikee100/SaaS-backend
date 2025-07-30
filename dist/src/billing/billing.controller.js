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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const billing_service_1 = require("./billing.service");
let BillingController = class BillingController {
    billingService;
    constructor(billingService) {
        this.billingService = billingService;
    }
    async getPlans() {
        return this.billingService.getPlans();
    }
    async getCurrentSubscription(req) {
        return this.billingService.getCurrentSubscription(req.user.tenantId);
    }
    async getPlanLimits(req) {
        const limits = await this.billingService.getPlanLimits(req.user.tenantId);
        const subscription = await this.billingService.getCurrentSubscription(req.user.tenantId);
        return {
            currentPlan: subscription.plan?.name || 'Basic',
            limits,
            features: {
                analytics: limits.analyticsEnabled,
                advanced_reports: limits.advancedReports,
                priority_support: limits.prioritySupport,
                custom_branding: limits.customBranding,
                api_access: limits.apiAccess,
                bulk_operations: limits.bulkOperations,
                data_export: limits.dataExport,
                custom_fields: limits.customFields,
                advanced_security: limits.advancedSecurity,
                white_label: limits.whiteLabel,
                dedicated_support: limits.dedicatedSupport,
                sso_enabled: limits.ssoEnabled,
                audit_logs: limits.auditLogs,
                backup_restore: limits.backupRestore,
                custom_integrations: limits.customIntegrations,
            }
        };
    }
    async getEnterpriseFeatures(req) {
        return this.billingService.getEnterpriseFeatures(req.user.tenantId);
    }
    async createSubscription(req, body) {
        return {
            success: true,
            message: 'Subscription created successfully',
            planId: body.planId
        };
    }
    async updateSubscription(req, body) {
        return {
            success: true,
            message: 'Subscription updated successfully',
            planId: body.planId
        };
    }
    async cancelSubscription(req) {
        return {
            success: true,
            message: 'Subscription cancelled successfully'
        };
    }
    async getInvoices(req) {
        return this.billingService.getInvoices(req.user.tenantId);
    }
};
exports.BillingController = BillingController;
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('plans'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getPlans", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getCurrentSubscription", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('limits'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getPlanLimits", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('enterprise-features'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getEnterpriseFeatures", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('subscribe'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "createSubscription", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Put)('subscription'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "updateSubscription", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Delete)('subscription'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "cancelSubscription", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('invoices'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getInvoices", null);
exports.BillingController = BillingController = __decorate([
    (0, common_1.Controller)('billing'),
    __metadata("design:paramtypes", [billing_service_1.BillingService])
], BillingController);
//# sourceMappingURL=billing.controller.js.map