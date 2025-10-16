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
import { SubscriptionService } from '../billing/subscription.service';
export declare class SalesService {
    private prisma;
    private auditLogService;
    private realtimeGateway;
    private configurationService;
    private subscriptionService;
    constructor(prisma: PrismaService, auditLogService: AuditLogService, realtimeGateway: RealtimeGateway, configurationService: ConfigurationService, subscriptionService: SubscriptionService);
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
                price: number;
                sku: string;
            };
            id: string;
            quantity: number;
            saleId: string;
        }[];
        branch: {
            id: string;
            name: string;
            address: string | null;
        } | null;
        Tenant: {
            id: string;
            stripeCustomerId: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            backupRestore: boolean;
            customIntegrations: boolean;
            ssoEnabled: boolean;
            whiteLabel: boolean;
            businessType: string;
            contactEmail: string;
            contactPhone: string | null;
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
            businessCategory: string | null;
            businessDescription: string | null;
            businessHours: Prisma.JsonValue | null;
            businessLicense: string | null;
            businessSubcategory: string | null;
            customDomain: string | null;
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
            primaryProducts: Prisma.JsonValue | null;
            rateLimit: number | null;
            receiptLogo: string | null;
            secondaryColor: string | null;
            secondaryProducts: Prisma.JsonValue | null;
            socialMedia: Prisma.JsonValue | null;
            state: string | null;
            watermark: string | null;
            webhookUrl: string | null;
            dashboardLogoUrl: string | null;
            emailLogoUrl: string | null;
            loginLogoUrl: string | null;
            logoSettings: Prisma.JsonValue | null;
            pdfTemplate: Prisma.JsonValue | null;
            mobileLogoUrl: string | null;
            auditLogsEnabled: boolean;
            credits: number | null;
        };
        User: {
            id: string;
            name: string;
            email: string;
        };
        Branch: {
            id: string;
            tenantId: string;
            status: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            address: string | null;
            city: string | null;
            country: string | null;
            postalCode: string | null;
            state: string | null;
            customField: string | null;
            email: string | null;
            isMainBranch: boolean;
            logo: string | null;
            manager: string | null;
            openingHours: string | null;
            phone: string | null;
            street: string | null;
        } | null;
        SaleItem: ({
            product: {
                id: string;
                name: string;
                price: number;
                sku: string;
            };
        } & {
            id: string;
            price: number;
            productId: string;
            quantity: number;
            saleId: string;
        })[];
        id: string;
        tenantId: string;
        userId: string;
        createdAt: Date;
        branchId: string | null;
        total: number;
        paymentType: string;
        customerName: string | null;
        customerPhone: string | null;
        mpesaTransactionId: string | null;
        idempotencyKey: string | null;
        vatAmount: number | null;
    }>;
    getSales(tenantId: string, page?: number, limit?: number): Promise<{
        data: TransformedSale[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    listSales(tenantId: string, branchId?: string, limit?: number): Promise<{
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
        branch: {
            id: string;
            name: string;
            address: string | null;
        } | null;
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
        contactEmail: string;
        contactPhone: string | null;
        address: string | null;
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
