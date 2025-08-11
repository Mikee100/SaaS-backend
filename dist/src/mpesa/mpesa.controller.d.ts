import { MpesaService } from '../mpesa.service';
import { SalesService } from '../sales/sales.service';
export declare class MpesaController {
    private readonly mpesaService;
    private readonly salesService;
    private readonly logger;
    constructor(mpesaService: MpesaService, salesService: SalesService);
    handleCallback(data: any): Promise<{
        ResultCode: number;
        ResultDesc: string;
    }>;
    getTransaction(checkoutRequestId: string): Promise<any>;
    getTransactionsByPhone(phoneNumber: string, limit?: string): Promise<any>;
    cancelTransaction(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
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
    cleanupOldPendingTransactions(): Promise<any>;
}
