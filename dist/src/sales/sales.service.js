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
const configuration_service_1 = require("../config/configuration.service");
const axios_1 = require("axios");
let SalesService = class SalesService {
    prisma;
    auditLogService;
    realtimeGateway;
    configurationService;
    constructor(prisma, auditLogService, realtimeGateway, configurationService) {
        this.prisma = prisma;
        this.auditLogService = auditLogService;
        this.realtimeGateway = realtimeGateway;
        this.configurationService = configurationService;
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
            const product = await this.prisma.product.findUnique({
                where: { id: item.productId },
                select: {
                    id: true,
                    name: true,
                    price: true,
                    tenantId: true,
                },
            });
            if (!product || product.tenantId !== tenantId)
                throw new common_1.BadRequestException('Invalid product');
            subtotal += product.price * item.quantity;
            receiptItems.push({
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: item.quantity,
            });
        }
        const vatRate = 0.16;
        const vatAmount = Math.round(subtotal * vatRate * 100) / 100;
        const total = subtotal + vatAmount;
        await this.prisma.$transaction(async (prisma) => {
            for (const item of dto.items) {
                await prisma.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: {
                            decrement: item.quantity,
                        },
                    },
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
                },
            });
            for (const item of dto.items) {
                await prisma.saleItem.create({
                    data: {
                        id: (0, uuid_1.v4)(),
                        saleId,
                        productId: item.productId,
                        quantity: item.quantity,
                        price: receiptItems.find((i) => i.productId === item.productId)?.price ||
                            0,
                    },
                });
            }
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
        if (!id)
            throw new common_1.BadRequestException('Sale ID is required');
        if (!tenantId)
            throw new common_1.BadRequestException('Tenant ID is required');
        try {
            console.log(`Fetching sale with ID: ${id} for tenant: ${tenantId}`);
            const sale = await this.prisma.sale.findUnique({
                where: { id, tenantId },
                include: {
                    User: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    SaleItem: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    price: true,
                                    sku: true,
                                },
                            },
                        },
                    },
                    mpesaTransaction: {
                        select: {
                            id: true,
                            phoneNumber: true,
                            amount: true,
                            status: true,
                            transactionId: true,
                            responseDesc: true,
                            createdAt: true,
                        },
                    },
                    Tenant: true,
                    Branch: true,
                },
            });
            if (!sale) {
                console.log(`Sale not found with ID: ${id} for tenant: ${tenantId}`);
                throw new common_1.NotFoundException('Sale not found');
            }
            const result = {
                ...sale,
                saleId: sale.id,
                cashier: sale.User
                    ? {
                        id: sale.User.id,
                        name: sale.User.name,
                        email: sale.User.email,
                    }
                    : null,
                mpesaTransaction: sale.mpesaTransaction
                    ? {
                        phoneNumber: sale.mpesaTransaction.phoneNumber,
                        amount: sale.mpesaTransaction.amount,
                        status: sale.mpesaTransaction.status,
                        mpesaReceipt: sale.mpesaTransaction.transactionId || '',
                        message: sale.mpesaTransaction.responseDesc || '',
                        transactionDate: sale.mpesaTransaction.createdAt,
                    }
                    : null,
                items: sale.SaleItem.map((item) => ({
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
        if (!tenantId)
            throw new common_1.BadRequestException('Tenant ID is required');
        if (page < 1)
            page = 1;
        if (limit < 1 || limit > 100)
            limit = 10;
        const skip = (page - 1) * limit;
        const total = await this.prisma.sale.count({ where: { tenantId } });
        const sales = await this.prisma.$queryRaw `
      SELECT 
        s.*,
        u.id as "userId",
        u.name as "userName",
        u.email as "userEmail",
        b.id as "branchId",
        b.name as "branchName",
        b.address as "branchAddress"
      FROM "Sale" s
      LEFT JOIN "User" u ON s."userId" = u.id
      LEFT JOIN "Branch" b ON s."branchId" = b.id
      WHERE s."tenantId" = ${tenantId}
      ORDER BY s."createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `;
        const saleIds = sales.map((sale) => sale.id);
        const saleItems = await this.prisma.saleItem.findMany({
            where: {
                saleId: { in: saleIds },
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        sku: true,
                    },
                },
            },
        });
        const mpesaTransactions = await this.prisma.mpesaTransaction.findMany({
            where: {
                saleId: { in: saleIds },
            },
            select: {
                id: true,
                saleId: true,
                phoneNumber: true,
                amount: true,
                status: true,
                transactionId: true,
                responseDesc: true,
                createdAt: true,
            },
        });
        const transformedSales = sales.map((sale) => {
            const items = saleItems
                .filter((item) => item.saleId === sale.id)
                .map((item) => ({
                ...item,
                productName: item.product?.name || 'Unknown',
            }));
            const mpesaTransaction = mpesaTransactions.find((tx) => tx.saleId === sale.id);
            return {
                ...sale,
                cashier: sale.userName || null,
                mpesaTransaction: mpesaTransaction
                    ? {
                        phoneNumber: mpesaTransaction.phoneNumber,
                        amount: mpesaTransaction.amount,
                        status: mpesaTransaction.status,
                    }
                    : null,
                items,
                branch: sale.branchId
                    ? {
                        id: sale.branchId,
                        name: sale.branchName || 'Unknown Branch',
                        address: sale.branchAddress,
                    }
                    : null,
            };
        });
        return {
            data: transformedSales,
            meta: {
                total,
                page,
                lastPage: Math.ceil(total / limit),
            },
        };
    }
    async listSales(tenantId, limit = 100) {
        if (!tenantId)
            throw new common_1.BadRequestException('Tenant ID is required');
        if (limit < 1 || limit > 1000)
            limit = 100;
        const sales = await this.prisma.sale.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                User: true,
                SaleItem: {
                    include: {
                        product: true,
                    },
                },
                mpesaTransaction: true,
                Branch: true,
                Tenant: true,
            },
        });
        return sales.map((sale) => ({
            saleId: sale.id,
            date: sale.createdAt,
            total: sale.total,
            paymentType: sale.paymentType,
            customerName: sale.customerName,
            customerPhone: sale.customerPhone,
            cashier: sale.User ? sale.User.name : null,
            mpesaTransaction: sale.mpesaTransaction
                ? {
                    phoneNumber: sale.mpesaTransaction.phoneNumber,
                    amount: sale.mpesaTransaction.amount,
                    status: sale.mpesaTransaction.status,
                }
                : null,
            items: sale.SaleItem.map((item) => ({
                productId: item.productId,
                name: item.product?.name || '',
                price: item.price,
                quantity: item.quantity,
            })),
        }));
    }
    async getAnalytics(tenantId, startDate, endDate) {
        if (!tenantId)
            throw new common_1.BadRequestException('Tenant ID is required');
        const end = endDate || new Date();
        const start = startDate || new Date();
        start.setDate(start.getDate() - 30);
        const sales = await this.prisma.sale.findMany({
            where: {
                tenantId,
                createdAt: {
                    gte: start,
                    lte: end,
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const saleItems = await this.prisma.saleItem.findMany({
            where: {
                saleId: {
                    in: sales.map((sale) => sale.id),
                },
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        sku: true,
                        cost: true,
                    },
                },
            },
        });
        const saleItemsBySaleId = {};
        for (const item of saleItems) {
            if (!saleItemsBySaleId[item.saleId]) {
                saleItemsBySaleId[item.saleId] = [];
            }
            if (item.product) {
                saleItemsBySaleId[item.saleId].push({
                    id: item.id,
                    saleId: item.saleId,
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price,
                    product: item.product
                        ? {
                            id: item.product.id,
                            name: item.product.name || 'Unknown',
                            price: item.product.price || 0,
                            sku: item.product.sku || '',
                            cost: item.product.cost || 0,
                        }
                        : null,
                });
            }
        }
        const salesWithItems = sales.map((sale) => {
            const items = saleItemsBySaleId[sale.id] || [];
            return {
                ...sale,
                SaleItem: items.map((item) => ({
                    id: item.id,
                    saleId: item.saleId,
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price,
                    product: item.product
                        ? {
                            id: item.product.id,
                            name: item.product.name || 'Unknown',
                            price: item.product.price || 0,
                            sku: item.product.sku || '',
                            cost: item.product.cost || 0,
                        }
                        : null,
                })),
            };
        });
        const totalSales = salesWithItems.length;
        const totalRevenue = salesWithItems.reduce((sum, s) => sum + (s.total || 0), 0);
        const avgSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;
        let totalProfit = 0;
        for (const sale of salesWithItems) {
            if (!sale.SaleItem || !Array.isArray(sale.SaleItem))
                continue;
            for (const item of sale.SaleItem) {
                if (item.product && item.product.cost !== undefined) {
                    totalProfit += (item.price - item.product.cost) * item.quantity;
                }
            }
        }
        const avgProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        const salesByProduct = {};
        for (const sale of salesWithItems) {
            if (!sale.SaleItem || !Array.isArray(sale.SaleItem))
                continue;
            for (const item of sale.SaleItem) {
                const productId = item.productId;
                if (item.product) {
                    const productName = item.product.name || 'N/A';
                    if (!salesByProduct[productId]) {
                        salesByProduct[productId] = {
                            name: productName,
                            quantity: 0,
                            revenue: 0,
                            profit: 0,
                        };
                    }
                    salesByProduct[productId].quantity += item.quantity;
                    salesByProduct[productId].revenue += item.price * item.quantity;
                    if (item.product.cost !== undefined) {
                        salesByProduct[productId].profit += (item.price - item.product.cost) * item.quantity;
                    }
                }
            }
        }
        const topProducts = Object.entries(salesByProduct)
            .map(([id, data]) => ({
            id,
            name: data.name,
            unitsSold: data.quantity,
            revenue: data.revenue,
            profit: data.profit,
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
                paymentBreakdown[sale.paymentType] =
                    (paymentBreakdown[sale.paymentType] || 0) + 1;
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
            if (!customerMap[key].lastPurchase ||
                new Date(sale.createdAt) > new Date(customerMap[key].lastPurchase)) {
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
            select: {
                id: true,
                name: true,
                stock: true,
                sku: true,
            },
            orderBy: { stock: 'asc' },
        });
        const customerInput = Object.values(customerMap).map((c) => ({
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
            totalProfit,
            avgProfitMargin,
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
                    SaleItem: {
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
            return recentSales.map((sale) => ({
                id: sale.id,
                total: sale.total,
                paymentMethod: sale.paymentType,
                customerName: sale.customerName || null,
                customerPhone: sale.customerPhone || null,
                date: sale.createdAt,
                items: sale.SaleItem.map((item) => ({
                    productId: item.product?.id || '',
                    productName: item.product?.name || 'Unknown',
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
        realtime_gateway_1.RealtimeGateway,
        configuration_service_1.ConfigurationService])
], SalesService);
//# sourceMappingURL=sales.service.js.map