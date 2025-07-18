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
let SalesService = class SalesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createSale(dto, tenantId, userId) {
        const saleId = (0, uuid_1.v4)();
        const now = new Date();
        let total = 0;
        const receiptItems = [];
        for (const item of dto.items) {
            const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
            if (!product || product.tenantId !== tenantId)
                throw new common_1.BadRequestException('Invalid product');
            if (product.stock < item.quantity)
                throw new common_1.BadRequestException(`Insufficient stock for ${product.name}`);
            total += product.price * item.quantity;
            receiptItems.push({
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: item.quantity,
            });
        }
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
                    paymentType: dto.paymentMethod,
                    createdAt: now,
                    mpesaTransactionId: dto.mpesaTransactionId,
                    customerName: dto.customerName,
                    customerPhone: dto.customerPhone,
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
        return {
            saleId,
            date: now,
            items: receiptItems,
            total,
            paymentMethod: dto.paymentMethod,
            amountReceived: dto.amountReceived,
            change: dto.amountReceived - total,
            customerName: dto.customerName,
            customerPhone: dto.customerPhone,
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
};
exports.SalesService = SalesService;
exports.SalesService = SalesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SalesService);
//# sourceMappingURL=sales.service.js.map