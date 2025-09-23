import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface MpesaTransactionData {
  userId?: string;
  phoneNumber: string;
  amount: number;
  status?: 'pending' | 'success' | 'failed' | 'cancelled' | 'timeout' | 'stock_unavailable';
  merchantRequestId?: string;
  checkoutRequestID?: string;
  message?: string;
  saleData?: any;
  transactionType?: string;
  businessShortCode?: string;
  billRefNumber?: string;
  invoiceNumber?: string;
  tenantId: string;
  transactionId?: string;
  orgAccountBalance?: string;
  thirdPartyTransID?: string;
  responseCode?: string;
  responseDesc?: string;
  mpesaReceipt?: string;
  saleId?: string;
  transactionTime?: Date;
}

export interface MpesaTransactionUpdate extends Partial<MpesaTransactionData> {
  status?: 'pending' | 'success' | 'failed' | 'cancelled' | 'timeout' | 'stock_unavailable';
  mpesaReceipt?: string;
  responseCode?: string;
  responseDesc?: string;
  message?: string;
  saleId?: string;
  transactionTime?: Date;
  orgAccountBalance?: string;
  thirdPartyTransID?: string;
}

@Injectable()
export class MpesaService {
  private readonly logger = new Logger(MpesaService.name);

<<<<<<< HEAD
  constructor(private readonly prisma: PrismaService) {}

  async createTransaction(data: MpesaTransactionData) {
    try {
      return await this.prisma.mpesaTransaction.create({ 
        data: {
          ...data,
          status: data.status || 'pending',
          transactionId: data.transactionId || undefined,
        }
      });
    } catch (error) {
      this.logger.error('Error creating M-Pesa transaction', error);
      throw error;
    }
  }

  async updateTransaction(
    id: string, 
    data: MpesaTransactionUpdate
  ) {
    try {
      return await this.prisma.mpesaTransaction.update({
        where: { id },
        data: {
          ...data,
          transactionTime: data.transactionTime || new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Error updating M-Pesa transaction ${id}`, error);
      throw error;
    }
  }

  async getTransactionById(id: string) {
    const transaction = await this.prisma.mpesaTransaction.findUnique({
      where: { id },
    });
    
    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }
    
    return transaction;
  }

  async getTransactionByCheckoutId(checkoutRequestID: string) {
    const transaction = await this.prisma.mpesaTransaction.findFirst({
      where: { checkoutRequestID },
    });
    
    if (!transaction) {
      throw new NotFoundException(`Transaction with checkout request ID ${checkoutRequestID} not found`);
    }
    
    return transaction;
  }

  async getTransactionsByUserId(userId: string, limit = 10) {
    return this.prisma.mpesaTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
=======
  async createTransaction(data: {
    userId?: string;
    phoneNumber: string;
    amount: number;
    status: string;
    merchantRequestID?: string;
    checkoutRequestID?: string;
    message?: string;
    saleData?: any;
    tenantId: string;
  }) {
    // Remove userId if undefined (Prisma expects it to be present or omitted)
    const { userId, tenantId, ...rest } = data;
    const createData = userId ? { userId, tenantId, ...rest } : { tenantId, ...rest };
    return this.prisma.mpesaTransaction.create({ data: createData });
  }

  async updateTransaction(checkoutRequestId: string, update: Partial<{ status: string; mpesaReceipt: string; responseCode: string; responseDesc: string; message: string; }>) {
    return this.prisma.mpesaTransaction.updateMany({
      where: { checkoutRequestID: checkoutRequestId },
      data: update,
>>>>>>> a9ab4d8c5762126916fa97fc22de1f53d95703c1
    });
  }

  async getTransactionsByTenant(tenantId: string, limit = 50) {
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
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async cancelTransaction(checkoutRequestID: string) {
    const transaction = await this.getTransactionByCheckoutId(checkoutRequestID);
    
    if (transaction.status !== 'pending') {
      throw new Error('Only pending transactions can be cancelled');
    }
    
    return this.updateTransaction(transaction.id, { 
      status: 'cancelled',
      message: 'Transaction cancelled by user'
    });
  }

  async getTransactionStats(tenantId?: string) {
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
}