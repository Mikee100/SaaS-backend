import { PrismaService } from '../prisma.service';
import { Response } from 'express';
import { AuditLogService } from '../audit-log.service';
import { BillingService } from '../billing/billing.service';
import { SubscriptionService } from '../billing/subscription.service';
export declare class ProductService {
    private prisma;
    private auditLogService;
    private billingService;
    private subscriptionService;
    findAllByBranch(branchId: string, tenantId: string): Promise<any>;
    constructor(prisma: PrismaService, auditLogService: AuditLogService, billingService: BillingService, subscriptionService: SubscriptionService);
    findAllByTenantAndBranch(tenantId: string, branchId?: string): Promise<any>;
    createProduct(data: any, actorUserId?: string, ip?: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        price: number;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
        branchId: string | null;
        sku: string;
        stock: number;
        cost: number;
        images: string[];
        supplierId: string | null;
        bulkUploadRecordId: string | null;
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
        summary: {
            successful: number;
            failed: number;
            errors: any[];
        };
        uploadId: string;
    }>;
    getProductCount(tenantId: string, branchId?: string): Promise<number>;
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
    uploadProductImages(productId: string, files: Express.Multer.File[], tenantId: string, userId: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        price: number;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
        branchId: string | null;
        sku: string;
        stock: number;
        cost: number;
        images: string[];
        supplierId: string | null;
        bulkUploadRecordId: string | null;
    }>;
    deleteProductImage(productId: string, imageUrl: string, tenantId: string, userId: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        price: number;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
        branchId: string | null;
        sku: string;
        stock: number;
        cost: number;
        images: string[];
        supplierId: string | null;
        bulkUploadRecordId: string | null;
    }>;
    getImageUrl(imagePath: string): string;
}
