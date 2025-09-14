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
                amountReceived: dto.amountReceived ?? 0,
                change: (dto.amountReceived ?? 0) - existing.total,
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
                    branchId: dto.branchId,
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
            amountReceived: dto.amountReceived ?? 0,
            change: (dto.amountReceived ?? 0) - total,
            customerName: dto.customerName,
            customerPhone: dto.customerPhone,
        };
    }
    async getSaleById(id, tenantId) {
        if (!id || !tenantId) {
            throw new common_1.BadRequestException('Sale ID and Tenant ID are required');
        }
        try {
            console.log(`Fetching sale with ID: ${id} for tenant: ${tenantId}`);
            const sale = await this.prisma.sale.findUnique({
                where: { id, tenantId },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    items: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    price: true,
                                },
                            },
                        },
                    },
                    mpesaTransactions: {
                        select: {
                            id: true,
                            phoneNumber: true,
                            amount: true,
                            status: true,
                            transactionId: true,
                            responseDesc: true,
                            createdAt: true,
                        },
                        orderBy: {
                            createdAt: 'desc',
                        },
                        take: 1,
                    },
                    tenant: true,
                    branch: true,
                },
            });
            if (!sale) {
                console.log(`Sale not found with ID: ${id} for tenant: ${tenantId}`);
                throw new common_1.NotFoundException('Sale not found');
            }
            const result = {
                ...sale,
                saleId: sale.id,
                cashier: sale.user ? {
                    id: sale.user.id,
                    name: sale.user.name,
                    email: sale.user.email,
                } : null,
                mpesaTransaction: sale.mpesaTransactions?.[0] ? {
                    phoneNumber: sale.mpesaTransactions[0].phoneNumber,
                    amount: sale.mpesaTransactions[0].amount,
                    status: sale.mpesaTransactions[0].status,
                    mpesaReceipt: sale.mpesaTransactions[0].transactionId,
                    message: sale.mpesaTransactions[0].responseDesc || '',
                    transactionDate: sale.mpesaTransactions[0].createdAt,
                } : null,
                items: sale.items.map(item => ({
                    ...item,
                    name: item.product?.name || 'Unknown Product',
                    price: item.price || 0,
                    productId: item.product?.id || '',
                })),
            };
            return result;
        }
        catch (error) {
            console.error('Error in getSaleById:', error);
            throw error;
        }
    }
    async getSales(tenantId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [sales, total] = await Promise.all([
            this.prisma.sale.findMany({
                where: { tenantId },
                include: {
                    user: true,
                    items: {
                        include: {
                            product: true,
                        },
                    },
                    mpesaTransactions: true,
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.sale.count({ where: { tenantId } }),
        ]);
        return {
            data: sales.map(sale => ({
                ...sale,
                cashier: sale.user ? sale.user.name : null,
                mpesaTransaction: sale.mpesaTransactions?.[0] ? {
                    phoneNumber: sale.mpesaTransactions[0].phoneNumber,
                    amount: sale.mpesaTransactions[0].amount,
                    status: sale.mpesaTransactions[0].status,
                } : null,
                items: sale.items.map(item => ({
                    ...item,
                    productName: item.product?.name || 'Unknown',
                })),
            })),
            meta: {
                total,
                page,
                lastPage: Math.ceil(total / limit),
            },
        };
    }
    async listSales(tenantId) {
        const sales = await this.prisma.sale.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            include: {
                user: true,
                items: { include: { product: true } },
                mpesaTransactions: true,
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
            mpesaTransaction: sale.mpesaTransactions?.[0] ? {
                phoneNumber: sale.mpesaTransactions[0].phoneNumber,
                amount: sale.mpesaTransactions[0].amount,
                status: sale.mpesaTransactions[0].status,
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
            if (customerInput.length > 0 && process.env.AI_SERVICE_URL) {
                const res = await axios_1.default.post(`${process.env.AI_SERVICE_URL}/customer_segments`, {
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
            if (process.env.AI_SERVICE_URL) {
                const res = await axios_1.default.post(`${process.env.AI_SERVICE_URL}/forecast`, {
                    months,
                    sales: salesValues,
                    periods: 4,
                });
                forecast = res.data;
            }
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
                contactEmail: true,
                contactPhone: true,
            },
        });
        return tenant;
    }
    async getRecentSales(tenantId, limit = 10) {
        try {
            console.log(`Fetching recent sales for tenant: ${tenantId}`);
            const recentSales = await this.prisma.sale.findMany({
                where: { tenantId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                select: {
                    id: true,
                    total: true,
                    paymentType: true,
                    customerName: true,
                    customerPhone: true,
                    createdAt: true,
                    items: {
                        select: {
                            quantity: true,
                            price: true,
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
            });
            return recentSales.map(sale => ({
                id: sale.id,
                total: sale.total,
                paymentMethod: sale.paymentType,
                customerName: sale.customerName,
                customerPhone: sale.customerPhone,
                date: sale.createdAt,
                items: sale.items.map(item => ({
                    productId: item.product.id,
                    productName: item.product.name,
                    quantity: item.quantity,
                    price: item.price,
                    total: item.quantity * item.price,
                })),
            }));
        }
        catch (error) {
            console.error('Error fetching recent sales:', {
                error: error.message,
                stack: error.stack,
                tenantId,
            });
            return [];
        }
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