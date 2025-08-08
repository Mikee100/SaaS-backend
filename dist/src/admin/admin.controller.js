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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const admin_service_1 = require("./admin.service");
const superadmin_guard_1 = require("./superadmin.guard");
let AdminController = class AdminController {
    adminService;
    constructor(adminService) {
        this.adminService = adminService;
    }
    async testEndpoint() {
        return { message: 'Admin endpoint is working' };
    }
    async testAnalytics() {
        console.log('testAnalytics called');
        const result = await this.adminService.getTenantAnalytics();
        console.log('testAnalytics result:', result);
        return result;
    }
    async testComparison() {
        console.log('testComparison called');
        const result = await this.adminService.getTenantComparison();
        console.log('testComparison result:', result);
        return result;
    }
    async testBackups() {
        console.log('testBackups called');
        const result = await this.adminService.getTenantBackups();
        console.log('testBackups result:', result);
        return result;
    }
    async testMigrations() {
        console.log('testMigrations called');
        const result = await this.adminService.getTenantMigrations();
        console.log('testMigrations result:', result);
        return result;
    }
    async getAllTenants() {
        return this.adminService.getAllTenants();
    }
    async getAllUsers() {
        return this.adminService.getAllUsers();
    }
    async getPlatformStats() {
        return this.adminService.getPlatformStats();
    }
    async getPlatformLogs() {
        return this.adminService.getPlatformLogs();
    }
    async getSystemHealth() {
        return this.adminService.getSystemHealth();
    }
    async getPerformanceMetrics() {
        return this.adminService.getPerformanceMetrics();
    }
    async getRealTimeMetrics() {
        return this.adminService.getRealTimeMetrics();
    }
    async getSupportTickets(status, priority) {
        return this.adminService.getSupportTickets(status, priority);
    }
    async getSupportTicket(id) {
        return this.adminService.getSupportTicket(id);
    }
    async getTicketResponses(id) {
        return this.adminService.getTicketResponses(id);
    }
    async addTicketResponse(id, responseData, req) {
        return this.adminService.addTicketResponse(id, responseData, req.user);
    }
    async updateTicket(id, updateData) {
        return this.adminService.updateTicket(id, updateData);
    }
    async getBulkOperations() {
        return this.adminService.getBulkOperations();
    }
    async executeBulkAction(actionData, req) {
        return this.adminService.executeBulkAction(actionData, req.user);
    }
    async createTenant(tenantData) {
        return this.adminService.createTenant(tenantData);
    }
    async deleteTenant(id) {
        return this.adminService.deleteTenant(id);
    }
    async getTenantById(id) {
        return this.adminService.getTenantById(id);
    }
    async getTenantAnalytics(timeRange) {
        console.log('=== getTenantAnalytics called ===');
        console.log('timeRange:', timeRange);
        console.log('User authenticated as superadmin');
        try {
            const result = await this.adminService.getTenantAnalytics();
            console.log('getTenantAnalytics result length:', result?.length);
            console.log('getTenantAnalytics result type:', typeof result);
            console.log('getTenantAnalytics result:', JSON.stringify(result, null, 2));
            return result;
        }
        catch (error) {
            console.error('Error in getTenantAnalytics:', error);
            throw error;
        }
    }
    async getTenantComparison() {
        console.log('getTenantComparison called');
        const result = await this.adminService.getTenantComparison();
        console.log('getTenantComparison result:', result);
        return result;
    }
    async getTenantBackups() {
        return this.adminService.getTenantBackups();
    }
    async createTenantBackup(backupData) {
        return this.adminService.createTenantBackup(backupData);
    }
    async restoreTenantBackup(restoreData) {
        return this.adminService.restoreTenantBackup(restoreData);
    }
    async getTenantMigrations() {
        return this.adminService.getTenantMigrations();
    }
    async migrateTenant(migrationData) {
        return this.adminService.migrateTenant(migrationData);
    }
    async getTenantResources() {
        return this.adminService.getTenantResources();
    }
    async getTenantPlans() {
        return this.adminService.getTenantPlans();
    }
    async updateTenantPlan(id, planData) {
        return this.adminService.updateTenantPlan(id, planData);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('test'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "testEndpoint", null);
__decorate([
    (0, common_1.Get)('test/analytics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "testAnalytics", null);
__decorate([
    (0, common_1.Get)('test/comparison'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "testComparison", null);
__decorate([
    (0, common_1.Get)('test/backups'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "testBackups", null);
__decorate([
    (0, common_1.Get)('test/migrations'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "testMigrations", null);
__decorate([
    (0, common_1.Get)('tenants'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAllTenants", null);
__decorate([
    (0, common_1.Get)('users'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAllUsers", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getPlatformStats", null);
__decorate([
    (0, common_1.Get)('logs'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getPlatformLogs", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getSystemHealth", null);
__decorate([
    (0, common_1.Get)('health/metrics'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getPerformanceMetrics", null);
__decorate([
    (0, common_1.Get)('health/metrics/realtime'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getRealTimeMetrics", null);
__decorate([
    (0, common_1.Get)('support/tickets'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('priority')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getSupportTickets", null);
__decorate([
    (0, common_1.Get)('support/tickets/:id'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getSupportTicket", null);
__decorate([
    (0, common_1.Get)('support/tickets/:id/responses'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getTicketResponses", null);
__decorate([
    (0, common_1.Post)('support/tickets/:id/responses'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "addTicketResponse", null);
__decorate([
    (0, common_1.Put)('support/tickets/:id'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateTicket", null);
__decorate([
    (0, common_1.Get)('bulk/operations'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getBulkOperations", null);
__decorate([
    (0, common_1.Post)('bulk/execute'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "executeBulkAction", null);
__decorate([
    (0, common_1.Post)('tenants'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createTenant", null);
__decorate([
    (0, common_1.Delete)('tenants/:id'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteTenant", null);
__decorate([
    (0, common_1.Get)('tenants/:id'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getTenantById", null);
__decorate([
    (0, common_1.Get)('tenants/analytics'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __param(0, (0, common_1.Query)('timeRange')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getTenantAnalytics", null);
__decorate([
    (0, common_1.Get)('tenants/comparison'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getTenantComparison", null);
__decorate([
    (0, common_1.Get)('tenants/backups'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getTenantBackups", null);
__decorate([
    (0, common_1.Post)('tenants/backups'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createTenantBackup", null);
__decorate([
    (0, common_1.Post)('tenants/restore'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "restoreTenantBackup", null);
__decorate([
    (0, common_1.Get)('tenants/migrations'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getTenantMigrations", null);
__decorate([
    (0, common_1.Post)('tenants/migrate'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "migrateTenant", null);
__decorate([
    (0, common_1.Get)('tenants/resources'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getTenantResources", null);
__decorate([
    (0, common_1.Get)('tenants/plans'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getTenantPlans", null);
__decorate([
    (0, common_1.Put)('tenants/:id/plan'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateTenantPlan", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map