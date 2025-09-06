import { ProductService } from './product.service';
import { Request, Response } from 'express';
export declare class ProductController {
    private readonly productService;
    constructor(productService: ProductService);
    findAll(req: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        tenantId: string;
        branchId: string | null;
        description: string | null;
        sku: string;
        price: number;
        cost: number;
        stock: number;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    create(body: any, req: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        tenantId: string;
        branchId: string | null;
        description: string | null;
        sku: string;
        price: number;
        cost: number;
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
    getQrCode(id: string, req: any, res: Response): Promise<void>;
    update(id: string, body: any, req: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
    remove(id: string, req: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
