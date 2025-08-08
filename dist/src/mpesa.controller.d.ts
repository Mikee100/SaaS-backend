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
            sale: {
                id: string;
                createdAt: Date;
                tenantId: string;
                branchId: string | null;
                userId: string;
                total: number;
                paymentType: string;
                customerName: string | null;
                customerPhone: string | null;
                mpesaTransactionId: string | null;
                idempotencyKey: string | null;
                vatAmount: number | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string | null;
            status: string;
            amount: number;
            message: string | null;
            phoneNumber: string;
            mpesaReceipt: string | null;
            merchantRequestId: string | null;
            checkoutRequestId: string | null;
            responseCode: string | null;
            responseDesc: string | null;
            saleData: import("@prisma/client/runtime/library").JsonValue | null;
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
            sale: {
                id: string;
                createdAt: Date;
                tenantId: string;
                branchId: string | null;
                userId: string;
                total: number;
                paymentType: string;
                customerName: string | null;
                customerPhone: string | null;
                mpesaTransactionId: string | null;
                idempotencyKey: string | null;
                vatAmount: number | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string | null;
            status: string;
            amount: number;
            message: string | null;
            phoneNumber: string;
            mpesaReceipt: string | null;
            merchantRequestId: string | null;
            checkoutRequestId: string | null;
            responseCode: string | null;
            responseDesc: string | null;
            saleData: import("@prisma/client/runtime/library").JsonValue | null;
        };
        error?: undefined;
    }>;
    getUserTransactions(userId: string, req: Request): Promise<{
        success: boolean;
        data: ({
            sale: {
                id: string;
                createdAt: Date;
                tenantId: string;
                branchId: string | null;
                userId: string;
                total: number;
                paymentType: string;
                customerName: string | null;
                customerPhone: string | null;
                mpesaTransactionId: string | null;
                idempotencyKey: string | null;
                vatAmount: number | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string | null;
            status: string;
            amount: number;
            message: string | null;
            phoneNumber: string;
            mpesaReceipt: string | null;
            merchantRequestId: string | null;
            checkoutRequestId: string | null;
            responseCode: string | null;
            responseDesc: string | null;
            saleData: import("@prisma/client/runtime/library").JsonValue | null;
        })[];
    }>;
    getTenantTransactions(tenantId: string): Promise<{
        success: boolean;
        data: ({
            sale: {
                id: string;
                createdAt: Date;
                tenantId: string;
                branchId: string | null;
                userId: string;
                total: number;
                paymentType: string;
                customerName: string | null;
                customerPhone: string | null;
                mpesaTransactionId: string | null;
                idempotencyKey: string | null;
                vatAmount: number | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string | null;
            status: string;
            amount: number;
            message: string | null;
            phoneNumber: string;
            mpesaReceipt: string | null;
            merchantRequestId: string | null;
            checkoutRequestId: string | null;
            responseCode: string | null;
            responseDesc: string | null;
            saleData: import("@prisma/client/runtime/library").JsonValue | null;
        })[];
    }>;
    getTransactionStats(req: Request): Promise<{
        success: boolean;
        data: {
            total: number;
            pending: number;
            successful: number;
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
        data: ({
            sale: {
                id: string;
                createdAt: Date;
                tenantId: string;
                branchId: string | null;
                userId: string;
                total: number;
                paymentType: string;
                customerName: string | null;
                customerPhone: string | null;
                mpesaTransactionId: string | null;
                idempotencyKey: string | null;
                vatAmount: number | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string | null;
            status: string;
            amount: number;
            message: string | null;
            phoneNumber: string;
            mpesaReceipt: string | null;
            merchantRequestId: string | null;
            checkoutRequestId: string | null;
            responseCode: string | null;
            responseDesc: string | null;
            saleData: import("@prisma/client/runtime/library").JsonValue | null;
        })[];
    }>;
    cleanupOldTransactions(): Promise<{
        success: boolean;
        message: string;
    }>;
}
