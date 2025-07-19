import { ProductService } from './product.service';
import { Request } from 'express';
export declare class ProductController {
    private readonly productService;
    constructor(productService: ProductService);
    findAll(req: any): Promise<{
        id: string;
        description: string | null;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        sku: string;
        price: number;
        stock: number;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    create(body: any, req: any): Promise<{
        id: string;
        description: string | null;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        sku: string;
        price: number;
        stock: number;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    bulkUpload(file: Express.Multer.File, req: Request): Promise<{
        summary: {
            status: string;
            error: string;
        }[];
        uploadId?: undefined;
    } | {
        summary: any[];
        uploadId: string;
    }>;
    getBulkUploadProgress(uploadId: string): Promise<{
        processed: number;
        total: number;
    }>;
    randomizeStocks(req: any): Promise<{
        updated: number;
    }>;
    clearAll(req: Request): Promise<{
        deletedCount: number;
    }>;
    update(id: string, body: any, req: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
    remove(id: string, req: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
