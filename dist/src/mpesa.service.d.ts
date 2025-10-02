import { PrismaService } from './prisma.service';
export declare class MpesaService {
    readonly prisma: PrismaService;
    constructor(prisma: PrismaService);
    createTransaction(data: {
        userId?: string;
        phoneNumber: string;
        amount: number;
        status: string;
        merchantRequestID?: string;
        checkoutRequestID?: string;
        message?: string;
        saleData?: any;
        tenantId: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        userId: string | null;
        status: string;
        phoneNumber: string;
        amount: number;
        mpesaReceipt: string | null;
        merchantRequestId: string | null;
        responseCode: string | null;
        responseDesc: string | null;
        message: string | null;
        saleData: import("@prisma/client/runtime/library").JsonValue | null;
        billRefNumber: string | null;
        businessShortCode: string | null;
        checkoutRequestID: string | null;
        invoiceNumber: string | null;
        orgAccountBalance: string | null;
        saleId: string | null;
        thirdPartyTransID: string | null;
        transactionId: string | null;
        transactionTime: Date | null;
        transactionType: string | null;
    }>;
    updateTransaction(checkoutRequestId: string, update: Partial<{
        status: string;
        mpesaReceipt: string;
        responseCode: string;
        responseDesc: string;
        message: string;
    }>): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
