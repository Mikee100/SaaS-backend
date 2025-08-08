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
        saleData?: any;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
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
        saleData: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    updateTransaction(checkoutRequestId: string, update: Partial<{
        status: string;
        mpesaReceipt: string;
        responseCode: string;
        responseDesc: string;
        message: string;
    }>): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
