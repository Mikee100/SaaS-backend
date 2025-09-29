import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateSaleDto } from './create-sale.dto';
import { SaleReceiptDto } from './sale-receipt.dto';
interface RawSaleResult {
    id: string;
    tenantId: string;
    userId: string;
    total: number;
    paymentType: string;
    createdAt: Date;
    customerName: string | null;
    customerPhone: string | null;
    mpesaTransactionId: string | null;
    idempotencyKey: string | null;
    vatAmount: number | null;
    branchId: string | null;
    userName: string | null;
    userEmail: string | null;
    branchName: string | null;
    branchAddress: string | null;
}
export interface TransformedSale extends Omit<RawSaleResult, 'branchId' | 'branchName' | 'branchAddress'> {
    cashier: string | null;
    mpesaTransaction: {
        phoneNumber: string;
        amount: number;
        status: string;
    } | null;
    items: Array<{
        id: string;
        saleId: string;
        productId: string;
        quantity: number;
        price: number;
        productName: string;
        product?: {
            id: string;
            name: string;
            price: number;
            sku: string;
        };
    }>;
    branch: {
        id: string;
        name: string;
        address: string | null;
    } | null;
}
import { AuditLogService } from '../audit-log.service';
import { RealtimeGateway } from '../realtime.gateway';
import { ConfigurationService } from '../config/configuration.service';
export declare class SalesService {
    private prisma;
    private auditLogService;
    private realtimeGateway;
    private configurationService;
    constructor(prisma: PrismaService, auditLogService: AuditLogService, realtimeGateway: RealtimeGateway, configurationService: ConfigurationService);
    createSale(dto: CreateSaleDto & {
        mpesaTransactionId?: string;
        idempotencyKey: string;
    }, tenantId: string, userId: string): Promise<SaleReceiptDto>;
    getSaleById(id: string, tenantId: string): Promise<{
        saleId: string;
        cashier: {
            id: string;
            name: string;
            email: string;
        } | null;
        mpesaTransaction: {
            phoneNumber: string;
            amount: number;
            status: string;
            mpesaReceipt: string;
            message: string;
            transactionDate: Date;
        } | null;
        items: {
            name: string;
            price: number;
            productId: string;
            product: {
                id: string;
                name: string;
                sku: string;
                price: number;
            };
            id: string;
            saleId: string;
            quantity: number;
        }[];
        Branch: {
            id: string;
            tenantId: string;
            createdAt: Date;
            email: string | null;
            name: string;
            updatedAt: Date;
            status: string | null;
            address: string | null;
            city: string | null;
            country: string | null;
            customField: string | null;
            isMainBranch: boolean;
            logo: string | null;
            manager: string | null;
            openingHours: string | null;
            phone: string | null;
            postalCode: string | null;
            state: string | null;
            street: string | null;
        } | null;
        Tenant: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            address: string | null;
            city: string | null;
            country: string | null;
            postalCode: string | null;
            state: string | null;
            businessType: string;
            contactEmail: string;
            contactPhone: string | null;
            currency: string | null;
            logoUrl: string | null;
            timezone: string | null;
            vatNumber: string | null;
            taxId: string | null;
            website: string | null;
            annualRevenue: string | null;
            apiKey: string | null;
            backupRestore: boolean;
            businessCategory: string | null;
            businessDescription: string | null;
            businessHours: Prisma.JsonValue | null;
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
            primaryColor: string | null;
            primaryProducts: Prisma.JsonValue | null;
            rateLimit: number | null;
            receiptLogo: string | null;
            secondaryColor: string | null;
            secondaryProducts: Prisma.JsonValue | null;
            socialMedia: Prisma.JsonValue | null;
            ssoEnabled: boolean;
            stripeCustomerId: string | null;
            watermark: string | null;
            webhookUrl: string | null;
            whiteLabel: boolean;
            dashboardLogoUrl: string | null;
            emailLogoUrl: string | null;
            loginLogoUrl: string | null;
            logoSettings: Prisma.JsonValue | null;
            mobileLogoUrl: string | null;
            auditLogsEnabled: boolean;
            credits: number | null;
        };
        User: {
            id: string;
            email: string;
            name: string;
        };
        SaleItem: ({
            product: {
                id: string;
                name: string;
                sku: string;
                price: number;
            };
        } & {
            id: string;
            price: number;
            saleId: string;
            productId: string;
            quantity: number;
        })[];
        id: string;
        mpesaTransactionId: string | null;
        tenantId: string;
        userId: string;
        total: number;
        paymentType: string;
        createdAt: Date;
        customerName: string | null;
        customerPhone: string | null;
        idempotencyKey: string | null;
        vatAmount: number | null;
        branchId: string | null;
    }>;
    getSales(tenantId: string, page?: number, limit?: number): Promise<{
        data: TransformedSale[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    listSales(tenantId: string, limit?: number): Promise<{
        saleId: string;
        date: Date;
        total: number;
        paymentType: string;
        customerName: string | null;
        customerPhone: string | null;
        cashier: string | null;
        mpesaTransaction: {
            phoneNumber: string;
            amount: number;
            status: string;
        } | null;
        items: {
            productId: string;
            name: string;
            price: number;
            quantity: number;
        }[];
    }[]>;
    getAnalytics(tenantId: string, startDate?: Date, endDate?: Date): Promise<{
        totalSales: number;
        totalRevenue: number;
        avgSaleValue: number;
        totalProfit: number;
        avgProfitMargin: number;
        topProducts: {
            id: string;
            name: string;
            unitsSold: number;
            revenue: number;
            profit: number;
        }[];
        salesByMonth: Record<string, number>;
        topCustomers: {
            name: string;
            phone: string;
            total: number;
            count: number;
            lastPurchase?: Date;
        }[];
        forecast: {
            forecast_months: never[];
            forecast_sales: never[];
        };
        customerSegments: never[];
        paymentBreakdown: Record<string, number>;
        lowStock: {
            id: string;
            name: string;
            sku: string;
            stock: number;
        }[];
    }>;
    getTenantInfo(tenantId: string): Promise<{
        name: string;
        address: string | null;
        contactEmail: string;
        contactPhone: string | null;
    } | null>;
    getRecentSales(tenantId: string, limit?: number): Promise<{
        id: string;
        total: number;
        paymentMethod: string;
        customerName: string | null;
        customerPhone: string | null;
        date: Date;
        items: {
            productId: string;
            productName: string;
            quantity: number;
            price: number;
            total: number;
        }[];
    }[]>;
}
export {};
