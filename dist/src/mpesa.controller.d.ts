import { Response, Request } from 'express';
import { MpesaService } from './mpesa.service';
import { SalesService } from './sales/sales.service';
import { PrismaService } from './prisma.service';
export declare class MpesaController {
    private mpesaService;
    private salesService;
    private prisma;
    constructor(mpesaService: MpesaService, salesService: SalesService, prisma: PrismaService);
    initiateMpesa(body: any, req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    mpesaWebhook(body: any, req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getTransactionStatus(checkoutRequestId: string): Promise<{
        error: string;
        success?: undefined;
        data?: undefined;
    } | {
        success: boolean;
        data: {
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
        };
        error?: undefined;
    }>;
    getTransactionById(id: string): Promise<{
        error: string;
        success?: undefined;
        data?: undefined;
    } | {
        success: boolean;
        data: {
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
        };
        error?: undefined;
    }>;
    getUserTransactions(userId: string, req: Request): Promise<{
        success: boolean;
        data: {
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
        }[];
    }>;
    getTenantTransactions(tenantId: string): Promise<{
        success: boolean;
        data: {
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
        }[];
    }>;
    getTransactionStats(req: Request): Promise<{
        success: boolean;
        data: {
            total: number;
            pending: number;
            completed: number;
            failed: number;
            totalAmount: number;
        };
    }>;
    cancelTransaction(checkoutRequestId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getPendingTransactions(): Promise<{
        success: boolean;
        data: {
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
        }[];
    }>;
    cleanupOldTransactions(): Promise<{
        success: boolean;
        message: string;
    }>;
}
