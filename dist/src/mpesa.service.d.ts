import { PrismaService } from './prisma.service';
export interface MpesaTransactionData {
    userId?: string;
    phoneNumber: string;
    amount: number;
    status: 'pending' | 'success' | 'failed' | 'cancelled' | 'timeout' | 'stock_unavailable';
    merchantRequestId?: string;
    checkoutRequestId?: string;
    message?: string;
    saleData?: any;
}
export interface MpesaTransactionUpdate {
    status?: 'pending' | 'success' | 'failed' | 'cancelled' | 'timeout' | 'stock_unavailable';
    mpesaReceipt?: string;
    responseCode?: string;
    responseDesc?: string;
    message?: string;
}
export declare class MpesaService {
    readonly prisma: PrismaService;
    constructor(prisma: PrismaService);
    createTransaction(data: MpesaTransactionData): Promise<{
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
    }>;
    updateTransaction(checkoutRequestId: string, update: MpesaTransactionUpdate): Promise<import(".prisma/client").Prisma.BatchPayload>;
    getTransactionByCheckoutId(checkoutRequestId: string): Promise<({
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
    }) | null>;
    getTransactionById(id: string): Promise<({
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
    }) | null>;
    getTransactionsByUserId(userId: string, limit?: number): Promise<({
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
    })[]>;
    getTransactionsByTenant(tenantId: string, limit?: number): Promise<({
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
    })[]>;
    getPendingTransactions(): Promise<({
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
    })[]>;
    cancelTransaction(checkoutRequestId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    markTransactionAsTimeout(checkoutRequestId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    getTransactionStats(tenantId?: string): Promise<{
        total: number;
        pending: number;
        successful: number;
        failed: number;
        totalAmount: number;
    }>;
    cleanupOldPendingTransactions(): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
