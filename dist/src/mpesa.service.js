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
exports.MpesaService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("./prisma.service");
let MpesaService = class MpesaService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createTransaction(data) {
        return this.prisma.mpesaTransaction.create({
            data: {
                ...data,
                status: data.status || 'pending',
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        });
    }
    async updateTransaction(checkoutRequestId, update) {
        return this.prisma.mpesaTransaction.updateMany({
            where: { checkoutRequestId },
            data: {
                ...update,
                updatedAt: new Date(),
            },
        });
    }
    async getTransactionByCheckoutId(checkoutRequestId) {
        return this.prisma.mpesaTransaction.findFirst({
            where: { checkoutRequestId },
            include: { sale: true }
        });
    }
    async getTransactionById(id) {
        return this.prisma.mpesaTransaction.findUnique({
            where: { id },
            include: { sale: true }
        });
    }
    async getTransactionsByUserId(userId, limit = 50) {
        return this.prisma.mpesaTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: { sale: true }
        });
    }
    async getTransactionsByTenant(tenantId, limit = 50) {
        return this.prisma.mpesaTransaction.findMany({
            where: {
                userId: {
                    not: null
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: { sale: true }
        });
    }
    async getPendingTransactions() {
        return this.prisma.mpesaTransaction.findMany({
            where: { status: 'pending' },
            orderBy: { createdAt: 'asc' },
            include: { sale: true }
        });
    }
    async cancelTransaction(checkoutRequestId) {
        return this.updateTransaction(checkoutRequestId, {
            status: 'cancelled',
            message: 'Transaction cancelled by user'
        });
    }
    async markTransactionAsTimeout(checkoutRequestId) {
        return this.updateTransaction(checkoutRequestId, {
            status: 'timeout',
            message: 'Transaction timed out'
        });
    }
    async getTransactionStats(tenantId) {
        const [total, pending, successful, failed] = await Promise.all([
            this.prisma.mpesaTransaction.count(),
            this.prisma.mpesaTransaction.count({ where: { status: 'pending' } }),
            this.prisma.mpesaTransaction.count({ where: { status: 'success' } }),
            this.prisma.mpesaTransaction.count({ where: { status: 'failed' } })
        ]);
        const totalAmount = await this.prisma.mpesaTransaction.aggregate({
            where: { status: 'success' },
            _sum: { amount: true }
        });
        return {
            total,
            pending,
            successful,
            failed,
            totalAmount: totalAmount._sum.amount || 0
        };
    }
    async cleanupOldPendingTransactions() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return this.prisma.mpesaTransaction.updateMany({
            where: {
                status: 'pending',
                createdAt: { lt: oneHourAgo }
            },
            data: {
                status: 'timeout',
                message: 'Transaction timed out automatically'
            }
        });
    }
};
exports.MpesaService = MpesaService;
exports.MpesaService = MpesaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MpesaService);
//# sourceMappingURL=mpesa.service.js.map