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
let SalesService = class SalesService {
    prisma;
    auditLogService;
    constructor(prisma, auditLogService) {
        this.prisma = prisma;
        this.auditLogService = auditLogService;
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
        const sale = await this.prisma.sale.findFirst({
            where: { id, tenantId },
            include: {
                user: true,
                items: { include: { product: true } },
                mpesaTransaction: true,
            },
        });
        if (!sale) {
            throw new common_1.NotFoundException('Sale not found');
        }
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
            include: { items: true },
        });
        const totalSales = sales.length;
        const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
        const productStats = {};
        for (const sale of sales) {
            for (const item of sale.items) {
                const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
                if (!product)
                    continue;
                if (!productStats[product.id]) {
                    productStats[product.id] = { name: product.name, unitsSold: 0, revenue: 0 };
                }
                productStats[product.id].unitsSold += item.quantity;
                productStats[product.id].revenue += item.price * item.quantity;
            }
        }
        const topProducts = Object.entries(productStats)
            .map(([id, stat]) => ({ id, ...stat }))
            .sort((a, b) => b.unitsSold - a.unitsSold)
            .slice(0, 5);
        const lowStock = await this.prisma.product.findMany({
            where: { tenantId, stock: { lt: 5 } },
            select: { id: true, name: true, stock: true },
        });
        const paymentBreakdown = {};
        for (const sale of sales) {
            paymentBreakdown[sale.paymentType] = (paymentBreakdown[sale.paymentType] || 0) + 1;
        }
        return {
            totalSales,
            totalRevenue,
            topProducts,
            lowStock,
            paymentBreakdown,
        };
    }
};
exports.SalesService = SalesService;
exports.SalesService = SalesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, audit_log_service_1.AuditLogService])
], SalesService);
//# sourceMappingURL=sales.service.js.map