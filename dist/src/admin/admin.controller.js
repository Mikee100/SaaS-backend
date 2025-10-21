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
var AdminController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const admin_service_1 = require("./admin.service");
const superadmin_guard_1 = require("./superadmin.guard");
const subscription_service_1 = require("../billing/subscription.service");
const trial_guard_1 = require("../auth/trial.guard");
const audit_log_service_1 = require("../audit-log.service");
let AdminController = AdminController_1 = class AdminController {
    adminService;
    subscriptionService;
    auditLogService;
    logger = new common_1.Logger(AdminController_1.name);
    constructor(adminService, subscriptionService, auditLogService) {
        this.adminService = adminService;
        this.subscriptionService = subscriptionService;
        this.auditLogService = auditLogService;
    }
    async getBillingMetrics() {
        this.logger.log('AdminController: getBillingMetrics called');
        return this.adminService.getBillingMetrics();
    }
    async getAllSubscriptions() {
        this.logger.log('AdminController: getAllSubscriptions called');
        return this.adminService.getAllSubscriptions();
    }
    async getAllTenants() {
        this.logger.log('AdminController: getAllTenants called');
        const result = await this.adminService.getAllTenants();
        this.logger.log(`AdminController: getAllTenants returning ${result.length} tenants`);
        return result;
    }
    async getTenantById(tenantId) {
        this.logger.log(`AdminController: getTenantById called with tenantId: ${tenantId}`);
        return this.adminService.getTenantById(tenantId);
    }
    async getTenantProducts(tenantId) {
        this.logger.log(`AdminController: getTenantProducts called with tenantId: ${tenantId}`);
        return this.adminService.getTenantProducts(tenantId);
    }
    async getTenantTransactions(tenantId) {
        this.logger.log(`AdminController: getTenantTransactions called with tenantId: ${tenantId}`);
        return this.adminService.getTenantTransactions(tenantId);
    }
    async switchToTenant(tenantId) {
        this.logger.log(`AdminController: switchToTenant called with tenantId: ${tenantId}`);
        return this.adminService.switchToTenant(tenantId);
    }
    async getTenantsSpaceUsage() {
        this.logger.log('AdminController: getTenantsSpaceUsage called');
        return this.adminService.getTenantsSpaceUsage();
    }
    async getTenantsAnalytics() {
        this.logger.log('AdminController: getTenantsAnalytics called');
        const stats = await this.adminService.getTenantsSpaceUsage();
        return stats;
    }
    async createTrial(body) {
        this.logger.log(`AdminController: createTrial called for tenant: ${body.tenantId}`);
        return this.subscriptionService.createTrialSubscription(body.tenantId, body.durationHours, body.planId);
    }
    async getTrialStatus(tenantId) {
        this.logger.log(`AdminController: getTrialStatus called for tenant: ${tenantId}`);
        return this.subscriptionService.checkTrialStatus(tenantId);
    }
    async getAllPlans() {
        this.logger.log('AdminController: getAllPlans called');
        return this.adminService.getAllPlans();
    }
    async getPlanById(planId) {
        this.logger.log(`AdminController: getPlanById called with planId: ${planId}`);
        return this.adminService.getPlanById(planId);
    }
    async createPlan(planData) {
        this.logger.log('AdminController: createPlan called');
        return this.adminService.createPlan(planData);
    }
    async updatePlan(planId, planData) {
        this.logger.log(`AdminController: updatePlan called with planId: ${planId}`);
        return this.adminService.updatePlan(planId, planData);
    }
    async deletePlan(planId) {
        this.logger.log(`AdminController: deletePlan called with planId: ${planId}`);
        return this.adminService.deletePlan(planId);
    }
    async getAllPlanFeatures() {
        this.logger.log('AdminController: getAllPlanFeatures called');
        return this.adminService.getAllPlanFeatures();
    }
    async createTenant(tenantData) {
        this.logger.log('AdminController: createTenant called');
        return this.adminService.createTenant(tenantData);
    }
    async deleteTenant(tenantId) {
        this.logger.log(`AdminController: deleteTenant called with tenantId: ${tenantId}`);
        return this.adminService.deleteTenant(tenantId);
    }
    async getAllUsers() {
        this.logger.log('AdminController: getAllUsers called');
        return this.adminService.getAllUsers();
    }
    async updateUserStatus(userId, body) {
        this.logger.log(`AdminController: updateUserStatus called for userId: ${userId}, isDisabled: ${body.isDisabled}`);
        return this.adminService.updateUserStatus(userId, body.isDisabled);
    }
    async getAuditLogs(limit, tenantId) {
        this.logger.log('AdminController: getAuditLogs called');
        const limitNum = limit ? Number(limit) : 100;
        return this.auditLogService.getLogs(limitNum, tenantId);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('billing/metrics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getBillingMetrics", null);
__decorate([
    (0, common_1.Get)('billing/subscriptions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAllSubscriptions", null);
__decorate([
    (0, common_1.Get)('tenants'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAllTenants", null);
__decorate([
    (0, common_1.Get)('tenants/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getTenantById", null);
__decorate([
    (0, common_1.Get)('tenants/:id/products'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getTenantProducts", null);
__decorate([
    (0, common_1.Get)('tenants/:id/transactions'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getTenantTransactions", null);
__decorate([
    (0, common_1.Post)('tenants/:id/switch'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "switchToTenant", null);
__decorate([
    (0, common_1.Get)('tenants/space-usage'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getTenantsSpaceUsage", null);
__decorate([
    (0, common_1.Get)('tenants/analytics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getTenantsAnalytics", null);
__decorate([
    (0, common_1.Post)('trials'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createTrial", null);
__decorate([
    (0, common_1.Get)('trials/:tenantId'),
    __param(0, (0, common_1.Param)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getTrialStatus", null);
__decorate([
    (0, common_1.Get)('plans'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAllPlans", null);
__decorate([
    (0, common_1.Get)('plans/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getPlanById", null);
__decorate([
    (0, common_1.Post)('plans'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createPlan", null);
__decorate([
    (0, common_1.Put)('plans/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updatePlan", null);
__decorate([
    (0, common_1.Delete)('plans/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deletePlan", null);
__decorate([
    (0, common_1.Get)('plan-features'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAllPlanFeatures", null);
__decorate([
    (0, common_1.Post)('tenants'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createTenant", null);
__decorate([
    (0, common_1.Delete)('tenants/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteTenant", null);
__decorate([
    (0, common_1.Get)('users'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAllUsers", null);
__decorate([
    (0, common_1.Put)('users/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateUserStatus", null);
__decorate([
    (0, common_1.Get)('logs'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAuditLogs", null);
exports.AdminController = AdminController = AdminController_1 = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard, trial_guard_1.TrialGuard),
    __metadata("design:paramtypes", [admin_service_1.AdminService,
        subscription_service_1.SubscriptionService,
        audit_log_service_1.AuditLogService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map