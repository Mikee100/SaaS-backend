import { PrismaService } from '../prisma.service';
import { Response } from 'express';
import { AuditLogService } from '../audit-log.service';
import { BillingService } from '../billing/billing.service';
export declare class ProductService {
    private prisma;
    private auditLogService;
    private billingService;
    constructor(prisma: PrismaService, auditLogService: AuditLogService, billingService: BillingService);
    findAllByTenant(tenantId: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        price: number;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        sku: string;
        stock: number;
        branchId: string | null;
    }[]>;
    createProduct(data: any, actorUserId?: string, ip?: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        price: number;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        sku: string;
        stock: number;
        branchId: string | null;
    }>;
    updateProduct(id: string, data: any, tenantId: string, actorUserId?: string, ip?: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    deleteProduct(id: string, tenantId: string, actorUserId?: string, ip?: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    bulkUpload(file: Express.Multer.File, user: any, uploadId?: string): Promise<{
        summary: {
            status: string;
            error: string;
        }[];
        uploadId?: undefined;
    } | {
        summary: any[];
        uploadId: string;
    }>;
    static getBulkUploadProgress(uploadId: string): {
        processed: number;
        total: number;
    };
    clearAll(tenantId: string): Promise<{
        deletedCount: number;
    }>;
    randomizeAllStocks(tenantId: string): Promise<{
        updated: number;
    }>;
    generateQrCode(id: string, tenantId: string, res: Response): Promise<void>;
}
