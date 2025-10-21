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
        tenant: {
            id: string;
            name: string;
            businessType: string;
            contactEmail: string;
            contactPhone: string | null;
            createdAt: Date;
            updatedAt: Date;
            address: string | null;
            currency: string | null;
            logoUrl: string | null;
            timezone: string | null;
            vatNumber: string | null;
            city: string | null;
            country: string | null;
            taxId: string | null;
            website: string | null;
            annualRevenue: string | null;
            apiKey: string | null;
            backupRestore: boolean;
            businessCategory: string | null;
            businessDescription: string | null;
            businessHours: import("@prisma/client/runtime/library").JsonValue | null;
            businessLicense: string | null;
            businessSubcategory: string | null;
            customDomain: string | null;
            customIntegrations: boolean;
            employeeCount: string | null;
            etimsQrUrl: string | null;
            favicon: string | null;
            foundedYear: number | null;
            invoiceFooter: string | null;
            kraPin: string | null;
            latitude: number | null;
            longitude: number | null;
            postalCode: string | null;
            primaryColor: string | null;
            primaryProducts: import("@prisma/client/runtime/library").JsonValue | null;
            rateLimit: number | null;
            receiptLogo: string | null;
            secondaryColor: string | null;
            secondaryProducts: import("@prisma/client/runtime/library").JsonValue | null;
            socialMedia: import("@prisma/client/runtime/library").JsonValue | null;
            ssoEnabled: boolean;
            state: string | null;
            stripeCustomerId: string | null;
            watermark: string | null;
            webhookUrl: string | null;
            whiteLabel: boolean;
            dashboardLogoUrl: string | null;
            emailLogoUrl: string | null;
            loginLogoUrl: string | null;
            logoSettings: import("@prisma/client/runtime/library").JsonValue | null;
            pdfTemplate: import("@prisma/client/runtime/library").JsonValue | null;
            mobileLogoUrl: string | null;
            auditLogsEnabled: boolean;
            credits: number | null;
            mpesaConsumerKey: string | null;
            mpesaConsumerSecret: string | null;
            mpesaShortCode: string | null;
            mpesaPasskey: string | null;
            mpesaCallbackUrl: string | null;
            mpesaIsActive: boolean;
            mpesaEnvironment: string | null;
        };
        branch: {
            id: string;
            name: string;
            manager: string | null;
            createdAt: Date;
            updatedAt: Date;
            address: string | null;
            city: string | null;
            country: string | null;
            postalCode: string | null;
            state: string | null;
            tenantId: string;
            email: string | null;
            customField: string | null;
            isMainBranch: boolean;
            logo: string | null;
            openingHours: string | null;
            phone: string | null;
            status: string | null;
            street: string | null;
        } | null;
        category: {
            id: string;
            name: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            isActive: boolean;
        } | null;
        variations: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            price: number | null;
            isActive: boolean;
            branchId: string | null;
            sku: string;
            stock: number;
            cost: number | null;
            productId: string;
            attributes: import("@prisma/client/runtime/library").JsonValue;
        }[];
    } & {
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
        categoryId: string | null;
        hasVariations: boolean;
    }>;
    uploadImages(id: string, files: Express.Multer.File[], req: any): Promise<{
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
        categoryId: string | null;
        hasVariations: boolean;
    }>;
    deleteImage(id: string, body: {
        imageUrl: string;
    }, req: any): Promise<{
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
        categoryId: string | null;
        hasVariations: boolean;
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
    findOne(id: string, req: any): Promise<any>;
    createCategory(body: {
        name: string;
        description?: string;
    }, req: any): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        isActive: boolean;
    }>;
    getCategories(req: any): Promise<({
        _count: {
            products: number;
        };
        attributes: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            isActive: boolean;
            categoryId: string;
            values: string[];
            required: boolean;
            type: string;
        }[];
    } & {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        isActive: boolean;
    })[]>;
    updateCategory(id: string, body: {
        name?: string;
        description?: string;
    }, req: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
    deleteCategory(id: string, req: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
    createAttribute(body: {
        name: string;
        type: string;
        values?: string[];
        required?: boolean;
        categoryId: string;
    }, req: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        isActive: boolean;
        categoryId: string;
        values: string[];
        required: boolean;
        type: string;
    }>;
    getAttributesByCategory(categoryId: string, req: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        isActive: boolean;
        categoryId: string;
        values: string[];
        required: boolean;
        type: string;
    }[]>;
    updateAttribute(id: string, body: Partial<{
        name: string;
        type: string;
        values: string[];
        required: boolean;
    }>, req: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
    deleteAttribute(id: string, req: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
    createVariation(productId: string, body: {
        sku: string;
        price?: number;
        cost?: number;
        stock: number;
        attributes: any;
        branchId?: string;
    }, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        price: number | null;
        isActive: boolean;
        branchId: string | null;
        sku: string;
        stock: number;
        cost: number | null;
        productId: string;
        attributes: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getVariationsByProduct(productId: string, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        price: number | null;
        isActive: boolean;
        branchId: string | null;
        sku: string;
        stock: number;
        cost: number | null;
        productId: string;
        attributes: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
    updateVariation(id: string, body: Partial<{
        sku: string;
        price: number;
        cost: number;
        stock: number;
        attributes: any;
        isActive: boolean;
    }>, req: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
    deleteVariation(id: string, req: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
    generateVariations(id: string, req: any): Promise<{
        message: string;
        variations: number;
        attributes: {
            name: any;
            values: any;
        }[];
    }>;
}
