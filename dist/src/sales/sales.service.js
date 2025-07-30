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
exports.SalesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const uuid_1 = require("uuid");
const audit_log_service_1 = require("../audit-log.service");
const realtime_gateway_1 = require("../realtime.gateway");
const axios_1 = require("axios");
let SalesService = class SalesService {
    prisma;
    auditLogService;
    realtimeGateway;
    constructor(prisma, auditLogService, realtimeGateway) {
        this.prisma = prisma;
        this.auditLogService = auditLogService;
        this.realtimeGateway = realtimeGateway;
    }
    async createSale(dto, tenantId, userId) {
        if (!dto.idempotencyKey)
            throw new common_1.BadRequestException('Missing idempotency key');
        const existing = await this.prisma.sale.findFirst({
            where: { idempotencyKey: dto.idempotencyKey, userId },
        });
        if (existing) {
            return {
                saleId: existing.id,
                date: existing.createdAt,
                items: [],
                subtotal: (existing.total ?? 0) - (existing.vatAmount ?? 0),
                total: existing.total,
                vatAmount: existing.vatAmount ?? 0,
                paymentMethod: existing.paymentType,
                amountReceived: dto.amountReceived,
                change: dto.amountReceived - existing.total,
                customerName: existing.customerName || undefined,
                customerPhone: existing.customerPhone || undefined,
            };
        }
        const saleId = (0, uuid_1.v4)();
        const now = new Date();
        let subtotal = 0;
        const receiptItems = [];
        for (const item of dto.items) {
            const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
            if (!product || product.tenantId !== tenantId)
                throw new common_1.BadRequestException('Invalid product');
            if (product.stock < item.quantity)
                throw new common_1.BadRequestException(`Insufficient stock for ${product.name}`);
            subtotal += product.price * item.quantity;
            receiptItems.push({
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: item.quantity,
            });
        }
        const vatAmount = Math.round(subtotal * 0.16 * 100) / 100;
        const total = subtotal + vatAmount;
        await this.prisma.$transaction(async (prisma) => {
            for (const item of dto.items) {
                await prisma.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.quantity } },
                });
            }
            await prisma.sale.create({
                data: {
                    id: saleId,
                    tenantId,
                    userId,
                    total,
                    vatAmount,
                    paymentType: dto.paymentMethod,
                    createdAt: now,
                    mpesaTransactionId: dto.mpesaTransactionId,
                    customerName: dto.customerName,
                    customerPhone: dto.customerPhone,
                    idempotencyKey: dto.idempotencyKey,
                    items: {
                        create: dto.items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            price: receiptItems.find(i => i.productId === item.productId)?.price || 0,
                        })),
                    },
                },
            });
        });
        if (this.auditLogService) {
            await this.auditLogService.log(userId, 'sale_created', { saleId, items: dto.items, total }, undefined);
        }
        this.realtimeGateway.emitSalesUpdate({ saleId, items: dto.items, total });
        for (const item of dto.items) {
            this.realtimeGateway.emitInventoryUpdate({ productId: item.productId });
        }
        return {
            saleId,
            date: now,
            items: receiptItems,
            subtotal,
            total,
            vatAmount,
            paymentMethod: dto.paymentMethod,
            amountReceived: dto.amountReceived,
            change: dto.amountReceived - total,
            customerName: dto.customerName,
            customerPhone: dto.customerPhone,
        };
    }
    async getSaleById(id, tenantId) {
        console.log('getSaleById called with ID:', id, 'and tenantId:', tenantId);
        const sale = await this.prisma.sale.findFirst({
            where: { id, tenantId },
            include: {
                user: true,
                items: { include: { product: true } },
                mpesaTransaction: true,
            },
        });
        console.log('Database query result:', sale);
        if (!sale) {
            console.log('Sale not found in database');
            throw new common_1.NotFoundException('Sale not found');
        }
        console.log('Sale found, returning data');
        return {
            saleId: sale.id,
            date: sale.createdAt,
            total: sale.total,
            paymentType: sale.paymentType,
            customerName: sale.customerName,
            customerPhone: sale.customerPhone,
            cashier: sale.user ? sale.user.name : null,
            mpesaTransaction: sale.mpesaTransaction ? {
                phoneNumber: sale.mpesaTransaction.phoneNumber,
                amount: sale.mpesaTransaction.amount,
                status: sale.mpesaTransaction.status,
                mpesaReceipt: sale.mpesaTransaction.mpesaReceipt,
                message: sale.mpesaTransaction.message,
            } : null,
            items: sale.items.map(item => ({
                productId: item.productId,
                name: item.product?.name || '',
                price: item.price,
                quantity: item.quantity,
            })),
        };
    }
    async listSales(tenantId) {
        const sales = await this.prisma.sale.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            include: {
                user: true,
                items: { include: { product: true } },
                mpesaTransaction: true,
            },
        });
        return sales.map(sale => ({
            saleId: sale.id,
            date: sale.createdAt,
            total: sale.total,
            paymentType: sale.paymentType,
            customerName: sale.customerName,
            customerPhone: sale.customerPhone,
            cashier: sale.user ? sale.user.name : null,
            mpesaTransaction: sale.mpesaTransaction ? {
                phoneNumber: sale.mpesaTransaction.phoneNumber,
                amount: sale.mpesaTransaction.amount,
                status: sale.mpesaTransaction.status,
                mpesaReceipt: sale.mpesaTransaction.mpesaReceipt,
                message: sale.mpesaTransaction.message,
            } : null,
            items: sale.items.map(item => ({
                productId: item.productId,
                name: item.product?.name || '',
                price: item.price,
                quantity: item.quantity,
            })),
        }));
    }
    async getAnalytics(tenantId) {
        const sales = await this.prisma.sale.findMany({
            where: { tenantId },
            include: { items: { include: { product: true } } },
        });
        const totalSales = sales.length;
        const totalRevenue = sales.reduce((sum, s) => sum + (s.total || 0), 0);
        const avgSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;
        const salesByProduct = {};
        for (const sale of sales) {
            for (const item of sale.items) {
                if (!salesByProduct[item.productId]) {
                    salesByProduct[item.productId] = { name: item.product?.name || 'N/A', quantity: 0, revenue: 0 };
                }
                salesByProduct[item.productId].quantity += item.quantity;
                salesByProduct[item.productId].revenue += item.price * item.quantity;
            }
        }
        const topProducts = Object.entries(salesByProduct)
            .map(([id, data]) => ({
            id,
            name: data.name,
            unitsSold: data.quantity,
            revenue: data.revenue,
        }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        const salesByMonth = {};
        for (const sale of sales) {
            const month = sale.createdAt.toISOString().slice(0, 7);
            salesByMonth[month] = (salesByMonth[month] || 0) + (sale.total || 0);
        }
        const paymentBreakdown = {};
        for (const sale of sales) {
            if (sale.paymentType) {
                paymentBreakdown[sale.paymentType] = (paymentBreakdown[sale.paymentType] || 0) + 1;
            }
        }
        const customerMap = {};
        for (const sale of sales) {
            const key = (sale.customerName || '-') + (sale.customerPhone || '-');
            if (!customerMap[key]) {
                customerMap[key] = {
                    name: sale.customerName || '-',
                    phone: sale.customerPhone || '-',
                    total: 0,
                    count: 0,
                };
            }
            customerMap[key].total += sale.total || 0;
            customerMap[key].count += 1;
            if (!customerMap[key].lastPurchase || new Date(sale.createdAt) > new Date(customerMap[key].lastPurchase)) {
                customerMap[key].lastPurchase = sale.createdAt;
            }
        }
        const topCustomers = Object.values(customerMap)
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);
        const lowStock = await this.prisma.product.findMany({
            where: {
                tenantId,
                stock: { lt: 10 },
            },
        });
        const customerInput = Object.values(customerMap).map(c => ({
            name: c.name,
            total: c.total,
            count: c.count,
            last_purchase: c.lastPurchase || new Date().toISOString(),
        }));
        let customerSegments = [];
        try {
            if (customerInput.length > 0) {
                const res = await axios_1.default.post('http://localhost:5000/customer_segments', {
                    customers: customerInput,
                });
                customerSegments = res.data;
            }
        }
        catch (e) {
        }
        const months = Object.keys(salesByMonth);
        const salesValues = Object.values(salesByMonth);
        let forecast = { forecast_months: [], forecast_sales: [] };
        try {
            const res = await axios_1.default.post('http://localhost:5000/forecast', {
                months,
                sales: salesValues,
                periods: 4,
            });
            forecast = res.data;
        }
        catch (e) {
        }
        return {
            totalSales,
            totalRevenue,
            avgSaleValue,
            topProducts,
            salesByMonth,
            topCustomers,
            forecast,
            customerSegments,
            paymentBreakdown,
            lowStock,
        };
    }
    async getTenantInfo(tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                name: true,
                address: true,
                phone: true,
                email: true,
            },
        });
        return tenant;
    }
};
exports.SalesService = SalesService;
exports.SalesService = SalesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_log_service_1.AuditLogService,
        realtime_gateway_1.RealtimeGateway])
], SalesService);
//# sourceMappingURL=sales.service.js.map