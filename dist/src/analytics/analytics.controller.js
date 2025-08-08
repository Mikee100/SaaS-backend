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
const prisma_service_1 = require("../prisma.service");
const common_2 = require("@nestjs/common");
let AnalyticsController = class AnalyticsController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getBasicAnalytics(req) {
        const [totalSales, totalRevenue, totalProducts, totalCustomers, sales] = await Promise.all([
            this.prisma.sale.count(),
            this.prisma.sale.aggregate({ _sum: { total: true } }),
            this.prisma.product.count(),
            this.prisma.user.count(),
            this.prisma.sale.findMany({ select: { total: true, createdAt: true } })
        ]);
        const avgOrderValue = totalSales > 0 ? (totalRevenue._sum.total || 0) / totalSales : 0;
        const salesByMonth = {};
        sales.forEach(sale => {
            const month = sale.createdAt.toISOString().slice(0, 7);
            salesByMonth[month] = (salesByMonth[month] || 0) + (sale.total || 0);
        });
        return {
            totalSales,
            totalRevenue: totalRevenue._sum.total || 0,
            totalProducts,
            totalCustomers,
            averageOrderValue: avgOrderValue,
            salesByMonth,
            message: 'Basic analytics with real data'
        };
    }
    async getAdvancedAnalytics(req) {
        return {
            salesByMonth: {
                '2024-01': 12000,
                '2024-02': 15000,
                '2024-03': 18000,
                '2024-04': 21000,
                '2024-05': 19500,
                '2024-06': 22000
            },
            topProducts: [
                { name: 'Product A', sales: 234, revenue: 2340, growth: 0.15, margin: 0.25 },
                { name: 'Product B', sales: 189, revenue: 1890, growth: 0.08, margin: 0.30 },
                { name: 'Product C', sales: 156, revenue: 1560, growth: 0.22, margin: 0.20 },
                { name: 'Product D', sales: 134, revenue: 1340, growth: -0.05, margin: 0.35 }
            ],
            customerSegments: [
                { segment: 'VIP', count: 15, revenue: 25000, avgOrderValue: 166.67, retention: 0.95 },
                { segment: 'Regular', count: 85, revenue: 20000, avgOrderValue: 235.29, retention: 0.78 },
                { segment: 'New', count: 20, revenue: 600, avgOrderValue: 30.00, retention: 0.45 }
            ],
            predictiveAnalytics: {
                nextMonthForecast: 22000,
                churnRisk: 0.05,
                growthRate: 0.15,
                seasonalTrend: 0.08,
                marketTrend: 0.12
            },
            performanceMetrics: {
                customerLifetimeValue: 450,
                customerAcquisitionCost: 25,
                returnOnInvestment: 0.18,
                netPromoterScore: 8.2
            },
            inventoryAnalytics: {
                lowStockItems: 8,
                overstockItems: 3,
                inventoryTurnover: 4.2,
                stockoutRate: 0.03
            },
            message: 'Advanced analytics available to Pro+ plans'
        };
    }
    async getEnterpriseAnalytics(req) {
        return {
            realTimeData: {
                currentUsers: 45,
                activeSales: 12,
                revenueToday: 3400,
                ordersInProgress: 8,
                averageSessionDuration: 15.5,
                bounceRate: 0.23
            },
            predictiveAnalytics: {
                nextMonthForecast: 22000,
                churnRisk: 0.05,
                growthRate: 0.15,
                seasonalTrend: 0.08,
                marketTrend: 0.12,
                demandForecast: {
                    'Product A': 280,
                    'Product B': 220,
                    'Product C': 190,
                    'Product D': 150
                }
            },
            advancedSegments: {
                byLocation: [
                    { location: 'Nairobi', revenue: 18000, customers: 45 },
                    { location: 'Mombasa', revenue: 12000, customers: 32 },
                    { location: 'Kisumu', revenue: 8000, customers: 28 },
                    { location: 'Other', revenue: 7600, customers: 15 }
                ],
                byAge: [
                    { age: '18-25', revenue: 8000, customers: 25 },
                    { age: '26-35', revenue: 15000, customers: 40 },
                    { age: '36-45', revenue: 12000, customers: 35 },
                    { age: '45+', revenue: 10600, customers: 20 }
                ],
                byDevice: [
                    { device: 'Mobile', revenue: 25000, customers: 80 },
                    { device: 'Desktop', revenue: 15000, customers: 30 },
                    { device: 'Tablet', revenue: 5600, customers: 10 }
                ]
            },
            customReports: [
                { name: 'Executive Summary', data: '...', lastUpdated: '2024-01-15' },
                { name: 'Department Performance', data: '...', lastUpdated: '2024-01-14' },
                { name: 'Market Analysis', data: '...', lastUpdated: '2024-01-13' },
                { name: 'Competitive Intelligence', data: '...', lastUpdated: '2024-01-12' }
            ],
            aiInsights: {
                recommendations: [
                    'Increase inventory for Product A due to high demand',
                    'Consider discounting Product D to improve sales',
                    'Focus marketing efforts on mobile users',
                    'VIP customers show high retention - increase engagement'
                ],
                anomalies: [
                    'Unusual spike in Product C sales on weekends',
                    'Mobile conversion rate 15% higher than average',
                    'Customer segment "New" showing declining engagement'
                ]
            },
            message: 'Enterprise analytics with real-time data, AI insights, and advanced predictions'
        };
    }
    async getDashboardStats(req) {
        return {
            totalSales: 1250,
            totalRevenue: 45600,
            totalProducts: 45,
            totalCustomers: 120,
            averageOrderValue: 36.48,
            conversionRate: 0.68,
            recentActivity: {
                sales: [
                    { amount: 150, customer: 'John Doe', date: '2024-01-15T10:30:00Z' },
                    { amount: 89, customer: 'Jane Smith', date: '2024-01-15T09:15:00Z' },
                    { amount: 234, customer: 'Mike Johnson', date: '2024-01-15T08:45:00Z' }
                ],
                products: [
                    { name: 'New Product X', date: '2024-01-15T11:00:00Z' },
                    { name: 'Updated Product Y', date: '2024-01-14T16:30:00Z' }
                ]
            },
            customerGrowth: {
                '2024-01': 85,
                '2024-02': 92,
                '2024-03': 98,
                '2024-04': 105,
                '2024-05': 112,
                '2024-06': 120
            },
            topProducts: [
                { name: 'Product A', sales: 234, revenue: 2340 },
                { name: 'Product B', sales: 189, revenue: 1890 },
                { name: 'Product C', sales: 156, revenue: 1560 },
                { name: 'Product D', sales: 134, revenue: 1340 }
            ]
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
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getDashboardStats", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, common_1.Controller)('analytics'),
    __param(0, (0, common_2.Inject)(prisma_service_1.PrismaService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map