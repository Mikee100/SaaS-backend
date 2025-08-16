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
var MpesaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MpesaService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("./prisma.service");
let MpesaService = MpesaService_1 = class MpesaService {
    prisma;
    logger = new common_1.Logger(MpesaService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createTransaction(data) {
        try {
            return await this.prisma.mpesaTransaction.create({
                data: {
                    ...data,
                    status: data.status || 'pending',
                    transactionId: data.transactionId || undefined,
                }
            });
        }
        catch (error) {
            this.logger.error('Error creating M-Pesa transaction', error);
            throw error;
        }
    }
    async updateTransaction(id, data) {
        try {
            return await this.prisma.mpesaTransaction.update({
                where: { id },
                data: {
                    ...data,
                    transactionTime: data.transactionTime || new Date(),
                },
            });
        }
        catch (error) {
            this.logger.error(`Error updating M-Pesa transaction ${id}`, error);
            throw error;
        }
    }
    async getTransactionById(id) {
        const transaction = await this.prisma.mpesaTransaction.findUnique({
            where: { id },
        });
        if (!transaction) {
            throw new common_1.NotFoundException(`Transaction with ID ${id} not found`);
        }
        return transaction;
    }
    async getTransactionByCheckoutId(checkoutRequestID) {
        const transaction = await this.prisma.mpesaTransaction.findFirst({
            where: { checkoutRequestID },
        });
        if (!transaction) {
            throw new common_1.NotFoundException(`Transaction with checkout request ID ${checkoutRequestID} not found`);
        }
        return transaction;
    }
    async getTransactionsByUserId(userId, limit = 10) {
        return this.prisma.mpesaTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    async getTransactionsByTenant(tenantId, limit = 50) {
        return this.prisma.mpesaTransaction.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    async getPendingTransactions(limit = 100) {
        return this.prisma.mpesaTransaction.findMany({
            where: {
                status: 'pending',
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    async cancelTransaction(checkoutRequestID) {
        const transaction = await this.getTransactionByCheckoutId(checkoutRequestID);
        if (transaction.status !== 'pending') {
            throw new Error('Only pending transactions can be cancelled');
        }
        return this.updateTransaction(transaction.id, {
            status: 'cancelled',
            message: 'Transaction cancelled by user'
        });
    }
    async getTransactionStats(tenantId) {
        const where = tenantId ? { tenantId } : {};
        const [total, pending, completed, failed] = await Promise.all([
            this.prisma.mpesaTransaction.count({ where }),
            this.prisma.mpesaTransaction.count({
                where: { ...where, status: 'pending' }
            }),
            this.prisma.mpesaTransaction.count({
                where: { ...where, status: 'success' }
            }),
            this.prisma.mpesaTransaction.count({
                where: {
                    ...where,
                    status: { in: ['failed', 'cancelled', 'timeout'] }
                }
            }),
        ]);
        const amountAggregate = await this.prisma.mpesaTransaction.aggregate({
            where: { ...where, status: 'success' },
            _sum: { amount: true },
        });
        return {
            total,
            pending,
            completed,
            failed,
            totalAmount: amountAggregate._sum.amount || 0,
        };
    }
};
exports.MpesaService = MpesaService;
exports.MpesaService = MpesaService = MpesaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MpesaService);
//# sourceMappingURL=mpesa.service.js.map