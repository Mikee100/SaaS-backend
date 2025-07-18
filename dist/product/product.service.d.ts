import { PrismaService } from '../prisma.service';
export declare class ProductService {
    private prisma;
    constructor(prisma: PrismaService);
    findAllByTenant(tenantId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        sku: string;
        price: number;
        description: string | null;
        stock: number;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    createProduct(data: {
        name: string;
        sku: string;
        price: number;
        description?: string;
        tenantId: string;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        sku: string;
        price: number;
        description: string | null;
        stock: number;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    updateProduct(id: string, data: any, tenantId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    deleteProduct(id: string, tenantId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
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
}
