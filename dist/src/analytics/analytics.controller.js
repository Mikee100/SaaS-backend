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
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const analytics_service_1 = require("./analytics.service");
let AnalyticsController = class AnalyticsController {
    analyticsService;
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    async getBasicAnalytics(req) {
        const tenantId = req.user.tenantId;
        if (!tenantId) {
            throw new Error('Tenant ID not found in user session');
        }
        try {
            const data = await this.analyticsService.getDashboardAnalytics(tenantId);
            return {
                totalSales: data.totalSales,
                totalRevenue: data.totalRevenue,
                totalProducts: data.totalProducts,
                message: 'Basic analytics available to all plans',
            };
        }
        catch (error) {
            console.error('Error fetching basic analytics:', error);
            throw new Error('Failed to fetch basic analytics');
        }
    }
    async getDashboardAnalytics(req) {
        const tenantId = req.user.tenantId;
        if (!tenantId) {
            throw new Error('Tenant ID not found in user session');
        }
        try {
            return await this.analyticsService.getDashboardAnalytics(tenantId);
        }
        catch (error) {
            console.error('Error fetching dashboard analytics:', error);
            throw new Error('Failed to fetch dashboard data');
        }
    }
    async getAdvancedAnalytics(req) {
        const tenantId = req.user.tenantId;
        if (!tenantId) {
            throw new Error('Tenant ID not found in user session');
        }
        try {
            const data = await this.analyticsService.getDashboardAnalytics(tenantId);
            return {
                ...data,
            };
        }
        catch (error) {
            console.error('Error fetching advanced analytics:', error);
            throw new Error('Failed to fetch advanced analytics');
        }
    }
    async getEnterpriseAnalytics(req) {
        const tenantId = req.user.tenantId;
        if (!tenantId) {
            throw new Error('Tenant ID not found in user session');
        }
        try {
            const data = await this.analyticsService.getDashboardAnalytics(tenantId);
            return {
                ...data,
            };
        }
        catch (error) {
            console.error('Error fetching enterprise analytics:', error);
            throw new Error('Failed to fetch enterprise analytics');
        }
    }
    async getDailySales(req) {
        const tenantId = req.user.tenantId;
        if (!tenantId) {
            throw new Error('Tenant ID not found in user session');
        }
        try {
            return await this.analyticsService.getDailySales(tenantId);
        }
        catch (error) {
            console.error('Error fetching daily sales:', error);
            throw new Error('Failed to fetch daily sales');
        }
    }
    async getWeeklySales(req) {
        const tenantId = req.user.tenantId;
        if (!tenantId) {
            throw new Error('Tenant ID not found in user session');
        }
        try {
            return await this.analyticsService.getWeeklySales(tenantId);
        }
        catch (error) {
            console.error('Error fetching weekly sales:', error);
            throw new Error('Failed to fetch weekly sales');
        }
    }
    async getYearlySales(req) {
        const tenantId = req.user.tenantId;
        if (!tenantId) {
            throw new Error('Tenant ID not found in user session');
        }
        try {
            return await this.analyticsService.getYearlySales(tenantId);
        }
        catch (error) {
            console.error('Error fetching yearly sales:', error);
            throw new Error('Failed to fetch yearly sales');
        }
    }
    async getBranchSales(req) {
        const { tenantId } = req.params;
        const { timeRange = '30days', branchId } = req.query;
        if (!tenantId) {
            throw new Error('Tenant ID is required');
        }
        try {
            return await this.analyticsService.getBranchSales(tenantId, timeRange, branchId);
        }
        catch (error) {
            console.error('Error fetching branch sales:', error);
            throw new Error('Failed to fetch branch sales data');
        }
    }
    async getBranchComparisonTimeSeries(req) {
        const { tenantId } = req.params;
        const { timeRange = '30days' } = req.query;
        if (!tenantId) {
            throw new Error('Tenant ID is required');
        }
        try {
            return await this.analyticsService.getBranchComparisonTimeSeries(tenantId, timeRange);
        }
        catch (error) {
            console.error('Error fetching branch comparison time series:', error);
            throw new Error('Failed to fetch branch comparison time series data');
        }
    }
    async getBranchProductComparison(req) {
        const { tenantId } = req.params;
        const { timeRange = '30days' } = req.query;
        if (!tenantId) {
            throw new Error('Tenant ID is required');
        }
        try {
            return await this.analyticsService.getBranchProductComparison(tenantId, timeRange);
        }
        catch (error) {
            console.error('Error fetching branch product comparison:', error);
            throw new Error('Failed to fetch branch product comparison data');
        }
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Get)('/analytics/basic'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getBasicAnalytics", null);
__decorate([
    (0, common_1.Get)('/analytics/dashboard'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getDashboardAnalytics", null);
__decorate([
    (0, common_1.Get)('/analytics/advanced'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getAdvancedAnalytics", null);
__decorate([
    (0, common_1.Get)('/analytics/enterprise'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getEnterpriseAnalytics", null);
__decorate([
    (0, common_1.Get)('/analytics/sales/daily'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getDailySales", null);
__decorate([
    (0, common_1.Get)('/analytics/sales/weekly'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getWeeklySales", null);
__decorate([
    (0, common_1.Get)('/analytics/sales/yearly'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getYearlySales", null);
__decorate([
    (0, common_1.Get)('/api/reports/branches/:tenantId/sales'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getBranchSales", null);
__decorate([
    (0, common_1.Get)('/api/reports/branches/:tenantId/comparison/timeseries'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getBranchComparisonTimeSeries", null);
__decorate([
    (0, common_1.Get)('/api/reports/branches/:tenantId/comparison/products'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getBranchProductComparison", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map