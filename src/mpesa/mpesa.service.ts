import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MpesaService {
  constructor(private prisma: PrismaService) {}

  async getTransactionByCheckoutId(checkoutRequestID: string) {
    return this.prisma.mpesaTransaction.findUnique({
      where: { checkoutRequestID },
    });
  }

  async getTransactionsByUserId(userId: string) {
    return this.prisma.mpesaTransaction.findMany({
      where: { userId },
      orderBy: { created_at: 'desc' },
    });
  }

  async getTransactionsByTenant(tenantId: string) {
    return this.prisma.mpesaTransaction.findMany({
      where: { tenantId },
      orderBy: { created_at: 'desc' },
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

  async cancelTransaction(checkoutRequestID: string) {
    const transaction = await this.prisma.mpesaTransaction.findUnique({
      where: { checkoutRequestID },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== 'pending') {
      throw new BadRequestException('Only pending transactions can be cancelled');
    }

    return this.prisma.mpesaTransaction.update({
      where: { checkoutRequestID },
      data: { status: 'cancelled' },
    });
  }

  async getPendingTransactions() {
    return this.prisma.mpesaTransaction.findMany({
      where: { status: 'pending' },
      orderBy: { created_at: 'desc' },
    });
  }
}
