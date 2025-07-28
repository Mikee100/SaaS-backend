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
const plan_guard_1 = require("../billing/plan.guard");
const plan_guard_2 = require("../billing/plan.guard");
let AnalyticsController = class AnalyticsController {
    async getBasicAnalytics(req) {
        return {
            totalSales: 1250,
            totalRevenue: 45600,
            totalProducts: 45,
            message: 'Basic analytics available to all plans'
        };
    }
    async getAdvancedAnalytics(req) {
        return {
            salesByMonth: {
                '2024-01': 12000,
                '2024-02': 15000,
                '2024-03': 18000
            },
            topProducts: [
                { name: 'Product A', sales: 234, revenue: 2340 },
                { name: 'Product B', sales: 189, revenue: 1890 }
            ],
            customerSegments: [
                { segment: 'VIP', count: 15, revenue: 25000 },
                { segment: 'Regular', count: 85, revenue: 20000 }
            ],
            message: 'Advanced analytics available to Pro+ plans'
        };
    }
    async getEnterpriseAnalytics(req) {
        return {
            realTimeData: {
                currentUsers: 45,
                activeSales: 12,
                revenueToday: 3400
            },
            predictiveAnalytics: {
                nextMonthForecast: 22000,
                churnRisk: 0.05,
                growthRate: 0.15
            },
            customReports: [
                { name: 'Executive Summary', data: '...' },
                { name: 'Department Performance', data: '...' }
            ],
            message: 'Enterprise analytics with real-time data and predictions'
        };
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Get)('basic'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getBasicAnalytics", null);
__decorate([
    (0, common_1.Get)('advanced'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), plan_guard_2.PlanGuard),
    (0, plan_guard_1.RequirePlan)('Pro'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getAdvancedAnalytics", null);
__decorate([
    (0, common_1.Get)('enterprise'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), plan_guard_2.PlanGuard),
    (0, plan_guard_1.RequirePlan)('Enterprise'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getEnterpriseAnalytics", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, common_1.Controller)('analytics')
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map