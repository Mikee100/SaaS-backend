import { PrismaService } from './prisma.service';
export declare class MpesaService {
    readonly prisma: PrismaService;
    constructor(prisma: PrismaService);
    createTransaction(data: {
        userId?: string;
        phoneNumber: string;
        amount: number;
        status: string;
        merchantRequestId?: string;
        checkoutRequestId?: string;
        message?: string;
    }): Promise<{
        id: string;
        userId: string | null;
        phoneNumber: string;
        amount: number;
        status: string;
        mpesaReceipt: string | null;
        merchantRequestId: string | null;
        checkoutRequestId: string | null;
        responseCode: string | null;
        responseDesc: string | null;
        message: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateTransaction(checkoutRequestId: string, update: Partial<{
        status: string;
        mpesaReceipt: string;
        responseCode: string;
        responseDesc: string;
        message: string;
    }>): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
