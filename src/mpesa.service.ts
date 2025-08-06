import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface MpesaTransactionData {
  userId?: string;
  phoneNumber: string;
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'cancelled' | 'timeout' | 'stock_unavailable';
  merchantRequestId?: string;
  checkoutRequestId?: string;
  message?: string;
  saleData?: any;
}

export interface MpesaTransactionUpdate {
  status?: 'pending' | 'success' | 'failed' | 'cancelled' | 'timeout' | 'stock_unavailable';
  mpesaReceipt?: string;
  responseCode?: string;
  responseDesc?: string;
  message?: string;
}

@Injectable()
export class MpesaService {
  constructor(public readonly prisma: PrismaService) {}

  async createTransaction(data: MpesaTransactionData) {
    return this.prisma.mpesaTransaction.create({ 
      data: {
        ...data,
        status: data.status || 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });
  }

  async updateTransaction(checkoutRequestId: string, update: MpesaTransactionUpdate) {
    return this.prisma.mpesaTransaction.updateMany({
      where: { checkoutRequestId },
      data: {
        ...update,
        updatedAt: new Date(),
      },
    });
  }

  async getTransactionByCheckoutId(checkoutRequestId: string) {
    return this.prisma.mpesaTransaction.findFirst({
      where: { checkoutRequestId },
      include: { sale: true }
    });
  }

  async getTransactionById(id: string) {
    return this.prisma.mpesaTransaction.findUnique({
      where: { id },
      include: { sale: true }
    });
  }

  async getTransactionsByUserId(userId: string, limit = 50) {
    return this.prisma.mpesaTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { sale: true }
    });
  }

  async getTransactionsByTenant(tenantId: string, limit = 50) {
    // Since MpesaTransaction doesn't have tenantId, we'll filter by userId
    // This assumes users are associated with tenants
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

  async cancelTransaction(checkoutRequestId: string) {
    return this.updateTransaction(checkoutRequestId, {
      status: 'cancelled',
      message: 'Transaction cancelled by user'
    });
  }

  async markTransactionAsTimeout(checkoutRequestId: string) {
    return this.updateTransaction(checkoutRequestId, {
      status: 'timeout',
      message: 'Transaction timed out'
    });
  }

  async getTransactionStats(tenantId?: string) {
    // Since MpesaTransaction doesn't have tenantId, we'll get all stats
    // In a real implementation, you might want to filter by user's tenant
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
} 