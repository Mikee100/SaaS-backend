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
const prisma_service_1 = require("../prisma.service");
let MpesaService = class MpesaService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getTransactionByCheckoutId(checkoutRequestID) {
        return this.prisma.mpesaTransaction.findUnique({
            where: { checkoutRequestID },
        });
    }
    async getTransactionsByUserId(userId, limit = 10) {
        return this.prisma.mpesaTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    async getTransactionsByPhoneNumber(phoneNumber, limit = 10) {
        return this.prisma.mpesaTransaction.findMany({
            where: { phoneNumber },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    async getTransactionsByTenant(tenantId) {
        return this.prisma.mpesaTransaction.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getTransactionStats() {
        const [total, pending, completed, failed] = await Promise.all([
            this.prisma.mpesaTransaction.count(),
            this.prisma.mpesaTransaction.count({ where: { status: 'pending' } }),
            this.prisma.mpesaTransaction.count({ where: { status: 'completed' } }),
            this.prisma.mpesaTransaction.count({ where: { status: 'failed' } }),
        ]);
        const totalAmount = await this.prisma.mpesaTransaction.aggregate({
            _sum: { amount: true },
            where: { status: 'completed' },
        });
        return {
            total,
            pending,
            completed,
            failed,
            totalAmount: totalAmount._sum.amount || 0,
        };
    }
    async cancelTransaction(checkoutRequestID) {
        const transaction = await this.prisma.mpesaTransaction.findUnique({
            where: { checkoutRequestID },
        });
        if (!transaction) {
            throw new common_1.NotFoundException('Transaction not found');
        }
        if (transaction.status !== 'pending') {
            throw new common_1.BadRequestException('Only pending transactions can be cancelled');
        }
        return this.prisma.mpesaTransaction.update({
            where: { checkoutRequestID },
            data: { status: 'cancelled' },
        });
    }
    async getPendingTransactions(limit = 100) {
        return this.prisma.mpesaTransaction.findMany({
            where: { status: 'pending' },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    async updateTransaction(id, data) {
        return this.prisma.mpesaTransaction.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });
    }
};
exports.MpesaService = MpesaService;
exports.MpesaService = MpesaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MpesaService);
//# sourceMappingURL=mpesa.service.js.map