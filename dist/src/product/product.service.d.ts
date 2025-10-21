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
        categoryId: string | null;
        hasVariations: boolean;
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
        categoryId: string | null;
        hasVariations: boolean;
    }>;
    getImageUrl(imagePath: string): string;
    findOne(id: string, tenantId: string): Promise<any>;
    createCategory(data: {
        name: string;
        description?: string;
        tenantId: string;
    }): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        isActive: boolean;
    }>;
    getCategories(tenantId: string): Promise<({
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
    updateCategory(id: string, data: {
        name?: string;
        description?: string;
    }, tenantId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    deleteCategory(id: string, tenantId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    createAttribute(data: {
        name: string;
        type: string;
        values?: string[];
        required?: boolean;
        categoryId: string;
        tenantId: string;
    }): Promise<{
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
    getAttributesByCategory(categoryId: string, tenantId: string): Promise<{
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
    updateAttribute(id: string, data: Partial<{
        name: string;
        type: string;
        values: string[];
        required: boolean;
    }>, tenantId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    deleteAttribute(id: string, tenantId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    createVariation(data: {
        productId: string;
        sku: string;
        price?: number;
        cost?: number;
        stock: number;
        attributes: any;
        tenantId: string;
        branchId?: string;
    }): Promise<{
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
    getVariationsByProduct(productId: string, tenantId: string): Promise<{
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
    updateVariation(id: string, data: Partial<{
        sku: string;
        price: number;
        cost: number;
        stock: number;
        attributes: any;
        isActive: boolean;
    }>, tenantId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    deleteVariation(id: string, tenantId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    generateVariationsFromAttributes(attributes: any[], baseProduct: any): {
        sku: string;
        price: any;
        cost: any;
        stock: number;
        attributes: {};
        tenantId: any;
        branchId: any;
    }[];
    private cartesianProduct;
    generateVariationsFromCustomFields(productId: string, tenantId: string, userId: string): Promise<{
        message: string;
        variations: number;
        attributes: {
            name: any;
            values: any;
        }[];
    }>;
}
