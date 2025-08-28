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
    });
  }
} 