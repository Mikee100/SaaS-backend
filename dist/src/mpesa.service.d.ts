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
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        phoneNumber: string;
        amount: number;
        status: string;
        merchantRequestId: string | null;
        checkoutRequestID: string | null;
        mpesaReceipt: string | null;
        responseCode: string | null;
        responseDesc: string | null;
        message: string | null;
        saleId: string | null;
        saleData: import("@prisma/client/runtime/library").JsonValue | null;
        transactionId: string | null;
        transactionType: string | null;
        transactionTime: Date | null;
        businessShortCode: string | null;
        billRefNumber: string | null;
        invoiceNumber: string | null;
        orgAccountBalance: string | null;
        thirdPartyTransID: string | null;
    }>;
    updateTransaction(checkoutRequestId: string, update: Partial<{
        status: string;
        mpesaReceipt: string;
        responseCode: string;
        responseDesc: string;
        message: string;
    }>): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
