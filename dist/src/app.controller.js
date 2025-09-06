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
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const prisma_service_1 = require("./prisma.service");
let AppController = class AppController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    getHello() {
        return 'Hello World!';
    }
    async getDashboardStats(req) {
        const tenantId = req.user.tenantId;
        try {
            const totalSales = await this.prisma.sale.count({
                where: { tenantId }
            });
            const totalProducts = await this.prisma.product.count({
                where: { tenantId }
            });
            const salesData = await this.prisma.sale.findMany({
                where: { tenantId },
                select: { total: true }
            });
            const totalRevenue = salesData.reduce((sum, sale) => sum + sale.total, 0);
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const monthlySales = await this.prisma.sale.findMany({
                where: {
                    tenantId,
                    createdAt: {
                        gte: startOfMonth,
                        lte: endOfMonth
                    }
                },
                select: { total: true }
            });
            const monthlyRevenue = monthlySales.reduce((sum, sale) => sum + sale.total, 0);
            const uniqueCustomers = await this.prisma.sale.findMany({
                where: {
                    tenantId,
                    customerName: { not: null }
                },
                select: { customerName: true },
                distinct: ['customerName']
            });
            const totalCustomers = uniqueCustomers.length;
            const recentSales = await this.prisma.sale.findMany({
                where: { tenantId },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: {
                    user: {
                        select: { name: true }
                    }
                }
            });
            const recentProducts = await this.prisma.product.findMany({
                where: { tenantId },
                orderBy: { createdAt: 'desc' },
                take: 3
            });
            return {
                totalSales,
                totalProducts,
                totalCustomers,
                totalRevenue,
                monthlyRevenue,
                recentActivity: {
                    sales: recentSales.map(sale => ({
                        id: sale.id,
                        amount: sale.total,
                        customer: sale.customerName || 'Anonymous',
                        date: sale.createdAt,
                        user: sale.user.name
                    })),
                    products: recentProducts.map(product => ({
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        date: product.createdAt
                    }))
                }
            };
        }
        catch (error) {
            console.error('Error fetching dashboard stats:', error);
            return {
                totalSales: 0,
                totalProducts: 0,
                totalCustomers: 0,
                totalRevenue: 0,
                monthlyRevenue: 0,
                recentActivity: {
                    sales: [],
                    products: []
                }
            };
        }
    }
    async getUsageStats(req) {
        const tenantId = req.user.tenantId;
        try {
            const userCount = await this.prisma.userRole.count({
                where: { tenantId }
            });
            const productCount = await this.prisma.product.count({
                where: { tenantId }
            });
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const monthlySales = await this.prisma.sale.count({
                where: {
                    tenantId,
                    createdAt: {
                        gte: startOfMonth,
                        lte: endOfMonth
                    }
                }
            });
            return {
                users: {
                    current: userCount,
                    limit: 10
                },
                products: {
                    current: productCount,
                    limit: 50
                },
                sales: {
                    current: monthlySales,
                    limit: 100
                }
            };
        }
        catch (error) {
            console.error('Error fetching usage stats:', error);
            return {
                users: { current: 1, limit: 10 },
                products: { current: 0, limit: 50 },
                sales: { current: 0, limit: 100 }
            };
        }
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], AppController.prototype, "getHello", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('dashboard/stats'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getDashboardStats", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('usage/stats'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getUsageStats", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AppController);
//# sourceMappingURL=app.controller.js.map