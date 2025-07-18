import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class MpesaService {
  constructor(public readonly prisma: PrismaService) {}

  async createTransaction(data: {
    userId?: string;
    phoneNumber: string;
    amount: number;
    status: string;
    merchantRequestId?: string;
    checkoutRequestId?: string;
    message?: string;
  }) {
    return this.prisma.mpesaTransaction.create({ data });
  }

  async updateTransaction(checkoutRequestId: string, update: Partial<{ status: string; mpesaReceipt: string; responseCode: string; responseDesc: string; message: string; }>) {
    return this.prisma.mpesaTransaction.updateMany({
      where: { checkoutRequestId },
      data: update,
    });
  }
} 