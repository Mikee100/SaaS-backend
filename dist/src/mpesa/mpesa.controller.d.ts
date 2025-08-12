import { MpesaService } from '../mpesa.service';
import { SalesService } from '../sales/sales.service';
export declare class MpesaController {
    private readonly mpesaService;
    private readonly salesService;
    private readonly logger;
    constructor(mpesaService: MpesaService, salesService: SalesService);
    handleCallback(callbackData: any): Promise<{
        success: boolean;
        transaction: {
            id: string;
            amount: number;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            userId: string | null;
            message: string | null;
            phoneNumber: string;
            merchantRequestId: string | null;
            checkoutRequestID: string | null;
            mpesaReceipt: string | null;
            responseCode: string | null;
            responseDesc: string | null;
            saleData: import("@prisma/client/runtime/library").JsonValue | null;
            transactionId: string | null;
            transactionType: string | null;
            transactionTime: Date | null;
            businessShortCode: string | null;
            billRefNumber: string | null;
            invoiceNumber: string | null;
            orgAccountBalance: string | null;
            thirdPartyTransID: string | null;
            saleId: string | null;
        };
    }>;
    getTransactions(): Promise<void>;
    getTransaction(id: string): Promise<any>;
    getPendingTransactions(): Promise<{
        id: string;
        amount: number;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        userId: string | null;
        message: string | null;
        phoneNumber: string;
        merchantRequestId: string | null;
        checkoutRequestID: string | null;
        mpesaReceipt: string | null;
        responseCode: string | null;
        responseDesc: string | null;
        saleData: import("@prisma/client/runtime/library").JsonValue | null;
        transactionId: string | null;
        transactionType: string | null;
        transactionTime: Date | null;
        businessShortCode: string | null;
        billRefNumber: string | null;
        invoiceNumber: string | null;
        orgAccountBalance: string | null;
        thirdPartyTransID: string | null;
        saleId: string | null;
    }[]>;
    cleanupOldPendingTransactions(): Promise<{
        success: boolean;
        count: number;
    }>;
}
