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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const client_1 = require("@prisma/client");
const axios_1 = require("axios");
let AnalyticsService = class AnalyticsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboardAnalytics(tenantId) {
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const [totalSales, totalRevenue, totalProducts, totalCustomers, salesByDay, salesByWeek, salesByMonth, topProducts, inventoryAnalytics, forecastData, anomaliesData, customerSegmentsData, churnPredictionData,] = await Promise.all([
            this.prisma.sale.count({
                where: {
                    tenantId,
                    createdAt: { gte: thirtyDaysAgo },
                },
            }),
            this.prisma.sale.aggregate({
                where: {
                    tenantId,
                    createdAt: { gte: thirtyDaysAgo },
                },
                _sum: { total: true },
            }),
            this.prisma.product.count({
                where: { tenantId },
            }),
            this.prisma.sale.groupBy({
                by: ['customerPhone'],
                where: {
                    tenantId,
                    customerPhone: { not: null },
                },
                _count: true,
            }),
            this.getSalesByTimePeriod(tenantId, 'day'),
            this.getSalesByTimePeriod(tenantId, 'week'),
            this.getSalesByTimePeriod(tenantId, 'month'),
            this.getTopProducts(tenantId, 5),
            this.getInventoryAnalytics(tenantId),
            this.generateSalesForecast(tenantId),
            this.getAnomaliesData(tenantId),
            this.getCustomerSegmentsData(tenantId),
            this.getChurnPredictionData(tenantId),
        ]);
        const repeatCustomers = await this.getRepeatCustomers(tenantId);
        const totalUniqueCustomers = totalCustomers.length;
        const retentionRate = totalUniqueCustomers > 0
            ? (repeatCustomers / totalUniqueCustomers) * 100
            : 0;
        const performanceMetrics = await this.calculatePerformanceMetrics(tenantId);
        const analyticsData = {
            totalSales,
            totalRevenue: totalRevenue._sum.total || 0,
            totalProducts,
            totalCustomers: totalUniqueCustomers,
            salesByDay,
            salesByWeek,
            salesByMonth,
            topProducts,
            customerRetention: {
                totalCustomers: totalUniqueCustomers,
                repeatCustomers,
                retentionRate: parseFloat(retentionRate.toFixed(2)),
            },
            inventoryAnalytics,
            performanceMetrics,
            realTimeData: await this.getRealTimeData(tenantId),
            forecast: forecastData,
            anomalies: anomaliesData,
            customerSegmentsAI: customerSegmentsData,
            churnPrediction: churnPredictionData,
        };
        let aiSummary = 'AI summary generation failed.';
        try {
            const summaryResponse = await axios_1.default.post('http://localhost:5001/generate_summary', {
                metrics: {
                    totalSales,
                    totalRevenue: totalRevenue._sum.total || 0,
                    avgSaleValue: totalSales > 0 ? (totalRevenue._sum.total || 0) / totalSales : 0,
                    topProducts: topProducts.map(p => ({ name: p.name })),
                    customerRetention: { retentionRate: parseFloat(retentionRate.toFixed(2)) },
                    forecastGrowth: forecastData.forecast_sales?.length > 1 ?
                        ((forecastData.forecast_sales[forecastData.forecast_sales.length - 1] - forecastData.forecast_sales[0]) / forecastData.forecast_sales[0]) * 100 : 0,
                },
            });
            aiSummary = summaryResponse.data.summary;
        }
        catch (error) {
            console.error('Failed to generate AI summary:', error);
        }
        return {
            ...analyticsData,
            aiSummary,
        };
    }
    async getSalesByTimePeriod(tenantId, period) {
        const now = new Date();
        const format = period === 'day'
            ? 'YYYY-MM-DD'
            : period === 'week'
                ? "'Week' WW"
                : period === 'month'
                    ? 'YYYY-MM'
                    : 'YYYY';
        const groupBy = period === 'day' ? 'day' : period === 'week' ? 'week' : period === 'month' ? 'month' : 'year';
        const date = new Date();
        if (period === 'day')
            date.setDate(date.getDate() - 7);
        else if (period === 'week')
            date.setDate(date.getDate() - 28);
        else if (period === 'month')
            date.setMonth(date.getMonth() - 6);
        else
            date.setFullYear(date.getFullYear() - 5);
        const sales = await this.prisma.$queryRaw `
      SELECT
        TO_CHAR("createdAt" AT TIME ZONE 'UTC', ${format}) as period,
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total
      FROM "Sale"
      WHERE "tenantId" = ${tenantId}
        AND "createdAt" >= ${date}
      GROUP BY period
      ORDER BY period ASC
    `;
        return sales.reduce((acc, curr) => ({
            ...acc,
            [curr.period]: parseFloat(curr.total),
        }), {});
    }
    async getDailySales(tenantId) {
        return this.getSalesByTimePeriod(tenantId, 'day');
    }
    async getWeeklySales(tenantId) {
        return this.getSalesByTimePeriod(tenantId, 'week');
    }
    async getYearlySales(tenantId) {
        return this.getSalesByTimePeriod(tenantId, 'year');
    }
    async getTopProducts(tenantId, limit) {
        const topProducts = await this.prisma.saleItem.groupBy({
            by: ['productId'],
            where: {
                sale: { tenantId },
            },
            _sum: {
                quantity: true,
                price: true,
            },
            _count: true,
            orderBy: {
                _sum: {
                    price: 'desc',
                },
            },
            take: limit,
        });
        const productDetails = await Promise.all(topProducts.map(async (item) => {
            const product = await this.prisma.product.findUnique({
                where: { id: item.productId },
            });
            const revenue = item._sum.price
                ? parseFloat(item._sum.price.toString())
                : 0;
            const quantity = item._sum.quantity || 0;
            const cost = product ? product.cost * quantity : 0;
            const margin = revenue > 0 ? (revenue - cost) / revenue : 0;
            return {
                name: product?.name || 'Unknown Product',
                sales: item._sum.quantity,
                revenue: revenue,
                margin: parseFloat(margin.toFixed(2)),
                cost: parseFloat(cost.toFixed(2)),
            };
        }));
        return productDetails;
    }
    async getInventoryAnalytics(tenantId) {
        const products = await this.prisma.product.findMany({
            where: { tenantId },
            include: { inventory: true },
        });
        const lowStockThreshold = 10;
        const overstockThreshold = 100;
        let lowStockItems = 0;
        let overstockItems = 0;
        let totalStockValue = 0;
        let totalCost = 0;
        products.forEach((product) => {
            const stock = product.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
            const value = stock * (product.price || 0);
            const cost = stock * (product.cost || 0);
            totalStockValue += value;
            totalCost += cost;
            if (stock <= lowStockThreshold)
                lowStockItems++;
            if (stock >= overstockThreshold)
                overstockItems++;
        });
        const cogs = await this.getCostOfGoodsSold(tenantId, 30);
        const avgInventoryValue = totalCost / 2;
        const inventoryTurnover = avgInventoryValue > 0 ? cogs / avgInventoryValue : 0;
        const stockoutRate = products.length > 0
            ? products.filter((p) => p.stock <= 0).length / products.length
            : 0;
        return {
            lowStockItems,
            overstockItems,
            inventoryTurnover: parseFloat(inventoryTurnover.toFixed(2)),
            stockoutRate: parseFloat(stockoutRate.toFixed(2)),
            totalStockValue: parseFloat(totalStockValue.toFixed(2)),
        };
    }
    async getCostOfGoodsSold(tenantId, days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        const sales = await this.prisma.saleItem.findMany({
            where: {
                sale: {
                    tenantId,
                    createdAt: { gte: date },
                },
            },
            include: {
                product: true,
            },
        });
        return sales.reduce((sum, item) => {
            const cost = item.product?.cost || 0;
            return sum + cost * item.quantity;
        }, 0);
    }
    async getRepeatCustomers(tenantId) {
        const repeatCustomers = await this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT "customerPhone", COUNT(*) as purchase_count
        FROM "Sale"
        WHERE "tenantId" = ${tenantId}
          AND "customerPhone" IS NOT NULL
        GROUP BY "customerPhone"
        HAVING COUNT(*) > 1
      `);
        return repeatCustomers.length;
    }
    async calculatePerformanceMetrics(tenantId) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const salesData = await this.prisma.sale.aggregate({
            where: {
                tenantId,
                createdAt: { gte: thirtyDaysAgo },
            },
            _sum: { total: true },
            _count: true,
        });
        const customerCount = await this.prisma.sale.groupBy({
            by: ['customerPhone'],
            where: {
                tenantId,
                customerPhone: { not: null },
                createdAt: { gte: thirtyDaysAgo },
            },
            _count: true,
        });
        const totalRevenue = salesData._sum.total || 0;
        const totalSales = salesData._count;
        const totalCustomers = customerCount.length;
        const customerLifetimeValue = totalCustomers > 0
            ? (totalRevenue * 3) / totalCustomers
            : 0;
        const customerAcquisitionCost = totalCustomers > 0
            ? 1000 / totalCustomers
            : 0;
        const returnOnInvestment = customerAcquisitionCost > 0
            ? (customerLifetimeValue - customerAcquisitionCost) /
                customerAcquisitionCost
            : 0;
        const netPromoterScore = 45;
        return {
            customerLifetimeValue: parseFloat(customerLifetimeValue.toFixed(2)),
            customerAcquisitionCost: parseFloat(customerAcquisitionCost.toFixed(2)),
            returnOnInvestment: parseFloat(returnOnInvestment.toFixed(2)),
            netPromoterScore: Math.min(100, Math.max(-100, netPromoterScore)),
        };
    }
    async getRealTimeData(tenantId) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const salesToday = await this.prisma.sale.count({
            where: {
                tenantId,
                createdAt: { gte: today },
            },
        });
        const revenueToday = await this.prisma.sale.aggregate({
            where: {
                tenantId,
                createdAt: { gte: today },
            },
            _sum: { total: true },
        });
        const activeUsers = await this.prisma.sale.groupBy({
            by: ['userId'],
            where: {
                tenantId,
                createdAt: { gte: today },
            },
        });
        const activeSales = await this.prisma.sale.count({
            where: {
                tenantId,
                createdAt: { gte: new Date(Date.now() - 3600000) },
            },
        });
        return {
            currentUsers: activeUsers.length,
            activeSales,
            revenueToday: revenueToday._sum.total || 0,
            ordersInProgress: salesToday,
            averageSessionDuration: 8.5,
            bounceRate: 0.32,
        };
    }
    async generateSalesForecast(tenantId) {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const historicalSales = await this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT
          TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM') as month,
          COUNT(*) as sales_count,
          COALESCE(SUM(total), 0) as total_revenue
        FROM "Sale"
        WHERE "tenantId" = ${tenantId}
          AND "createdAt" >= ${sixMonthsAgo}
        GROUP BY month
        ORDER BY month ASC
      `);
        if (historicalSales.length < 3) {
            const now = new Date();
            const forecastMonths = [];
            const forecastSales = [];
            for (let i = 1; i <= 6; i++) {
                const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
                forecastMonths.push(futureDate.toISOString().slice(0, 7));
                const baseSales = 150 + Math.random() * 100;
                const growthFactor = 1 + (i * 0.05) + (Math.random() * 0.1 - 0.05);
                forecastSales.push(Math.round(baseSales * growthFactor));
            }
            return {
                forecast_months: forecastMonths,
                forecast_sales: forecastSales,
            };
        }
        const salesData = historicalSales.map(item => ({
            month: item.month,
            sales: Number(item.sales_count),
            revenue: parseFloat(item.total_revenue),
        }));
        const n = salesData.length;
        const sumX = salesData.reduce((sum, _, index) => sum + index, 0);
        const sumY = salesData.reduce((sum, item) => sum + item.sales, 0);
        const sumXY = salesData.reduce((sum, item, index) => sum + index * item.sales, 0);
        const sumXX = salesData.reduce((sum, _, index) => sum + index * index, 0);
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        const now = new Date();
        const forecastMonths = [];
        const forecastSales = [];
        for (let i = 1; i <= 6; i++) {
            const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
            forecastMonths.push(futureDate.toISOString().slice(0, 7));
            const predictedSales = intercept + slope * (n + i - 1);
            const variance = 0.2;
            const randomFactor = 1 + (Math.random() * variance * 2 - variance);
            const finalPrediction = Math.max(1, Math.round(predictedSales * randomFactor));
            forecastSales.push(finalPrediction);
        }
        return {
            forecast_months: forecastMonths,
            forecast_sales: forecastSales,
        };
    }
    async getAnomaliesData(tenantId) {
        try {
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            const salesData = await this.prisma.$queryRaw(client_1.Prisma.sql `
          SELECT
            TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date,
            COUNT(*) as sales_count,
            COALESCE(SUM(total), 0) as total_revenue
          FROM "Sale"
          WHERE "tenantId" = ${tenantId}
            AND "createdAt" >= ${sixMonthsAgo}
          GROUP BY date
          ORDER BY date ASC
        `);
            const sales = salesData.map(item => ({
                date: item.date,
                value: parseFloat(item.total_revenue),
            }));
            if (sales.length < 5) {
                return [];
            }
            const response = await axios_1.default.post('http://localhost:5001/anomalies', {
                sales,
            });
            return response.data || [];
        }
        catch (error) {
            console.error('Failed to get anomalies data:', error);
            return [];
        }
    }
    async getCustomerSegmentsData(tenantId) {
        try {
            const customerData = await this.prisma.$queryRaw(client_1.Prisma.sql `
          SELECT
            COALESCE("customerName", 'Unknown') as name,
            COUNT(*) as count,
            COALESCE(SUM(total), 0) as total,
            MAX("createdAt") as last_purchase
          FROM "Sale"
          WHERE "tenantId" = ${tenantId}
            AND "customerPhone" IS NOT NULL
          GROUP BY "customerPhone", "customerName"
          HAVING COUNT(*) > 0
        `);
            const customers = customerData.map(item => ({
                name: item.name,
                total: parseFloat(item.total),
                count: Number(item.count),
                last_purchase: item.last_purchase.toISOString().split('T')[0],
            }));
            if (customers.length < 2) {
                return [];
            }
            const response = await axios_1.default.post('http://localhost:5001/customer_segments', {
                customers,
            });
            return response.data || [];
        }
        catch (error) {
            console.error('Failed to get customer segments data:', error);
            return [];
        }
    }
    async getChurnPredictionData(tenantId) {
        try {
            const customerData = await this.prisma.$queryRaw(client_1.Prisma.sql `
          SELECT
            COALESCE("customerName", 'Unknown') as name,
            COUNT(*) as count,
            COALESCE(SUM(total), 0) as total,
            MAX("createdAt") as last_purchase
          FROM "Sale"
          WHERE "tenantId" = ${tenantId}
            AND "customerPhone" IS NOT NULL
          GROUP BY "customerPhone", "customerName"
          HAVING COUNT(*) > 0
        `);
            const customers = customerData.map(item => ({
                name: item.name,
                total: parseFloat(item.total),
                count: Number(item.count),
                last_purchase: item.last_purchase.toISOString().split('T')[0],
            }));
            if (customers.length < 2) {
                return [];
            }
            const response = await axios_1.default.post('http://localhost:5001/churn_prediction', {
                customers,
            });
            return response.data || [];
        }
        catch (error) {
            console.error('Failed to get churn prediction data:', error);
            return [];
        }
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map