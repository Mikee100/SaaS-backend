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
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('test'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "testEndpoint", null);
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
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map