import { ProductService } from './product.service';
import { Request, Response } from 'express';
declare global {
    namespace Express {
        interface Multer {
            File: Express.Multer.File;
        }
    }
}
export declare class ProductController {
    private readonly productService;
    constructor(productService: ProductService);
    findAll(req: any): Promise<any>;
    create(body: any, req: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        description: string | null;
        price: number;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
        sku: string;
        stock: number;
        cost: number;
        images: string[];
        branchId: string | null;
        supplierId: string | null;
        bulkUploadRecordId: string | null;
    }>;
    uploadImages(id: string, files: Express.Multer.File[], req: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        description: string | null;
        price: number;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
        sku: string;
        stock: number;
        cost: number;
        images: string[];
        branchId: string | null;
        supplierId: string | null;
        bulkUploadRecordId: string | null;
    }>;
    deleteImage(id: string, body: {
        imageUrl: string;
    }, req: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        description: string | null;
        price: number;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
        sku: string;
        stock: number;
        cost: number;
        images: string[];
        branchId: string | null;
        supplierId: string | null;
        bulkUploadRecordId: string | null;
    }>;
    bulkUpload(file: Express.Multer.File, req: Request): Promise<{
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
    getProductCount(req: any): Promise<{
        count: number;
    }>;
}
