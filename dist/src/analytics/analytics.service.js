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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let AnalyticsService = class AnalyticsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSalesAnalytics(tenantId) {
        const sales = await this.prisma.sale.findMany({
            where: { tenantId },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });
        const totalSales = sales.length;
        const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
        const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
        const salesTrend = Array.from({ length: 30 }).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const daySales = sales.filter(sale => sale.createdAt.toISOString().split('T')[0] === dateStr);
            return {
                date: dateStr,
                amount: daySales.reduce((sum, sale) => sum + sale.total, 0),
            };
        });
        const productRevenue = new Map();
        sales.forEach(sale => {
            sale.items.forEach(item => {
                const existing = productRevenue.get(item.productId) || {
                    id: item.productId,
                    name: item.product.name,
                    revenue: 0,
                    quantity: 0,
                    cost: item.product.cost ?? 0,
                    margin: 0
                };
                const revenue = existing.revenue + (item.quantity * item.price);
                const quantity = existing.quantity + item.quantity;
                const cost = item.product.cost ?? 0;
                const margin = revenue > 0 ? (revenue - cost * quantity) / revenue : 0;
                productRevenue.set(item.productId, {
                    ...existing,
                    revenue,
                    quantity,
                    cost,
                    margin,
                });
            });
        });
        const topProducts = Array.from(productRevenue.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        return {
            totalSales,
            totalRevenue,
            averageOrderValue,
            salesTrend,
            topProducts,
        };
    }
    async getInventoryAnalytics(tenantId) {
        const products = await this.prisma.product.findMany({
            where: { tenantId },
        });
        const totalProducts = products.length;
        const totalValue = products.reduce((sum, product) => sum + (product.price * (product.stock || 0)), 0);
        const lowStockItems = products.filter(p => (p.stock || 0) <= 10 && (p.stock || 0) > 0).length;
        const outOfStockItems = products.filter(p => (p.stock || 0) <= 0).length;
        return {
            totalProducts,
            totalValue,
            lowStockItems,
            outOfStockItems,
        };
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map