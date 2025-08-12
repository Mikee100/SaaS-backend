import { PrismaService } from '../prisma.service';
import { CreateSaleDto } from './create-sale.dto';
import { SaleReceiptDto } from './sale-receipt.dto';
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
            mpesaReceipt: string | null;
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
            };
            id: string;
            saleId: string;
            quantity: number;
        }[];
        branch: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            address: string | null;
        } | null;
        tenant: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            stripeCustomerId: string | null;
            businessType: string;
            contactEmail: string;
            contactPhone: string | null;
            businessCategory: string | null;
            businessSubcategory: string | null;
            primaryProducts: import("@prisma/client/runtime/library").JsonValue | null;
            secondaryProducts: import("@prisma/client/runtime/library").JsonValue | null;
            businessDescription: string | null;
            address: string | null;
            city: string | null;
            state: string | null;
            country: string | null;
            postalCode: string | null;
            latitude: number | null;
            longitude: number | null;
            foundedYear: number | null;
            employeeCount: string | null;
            annualRevenue: string | null;
            businessHours: import("@prisma/client/runtime/library").JsonValue | null;
            website: string | null;
            socialMedia: import("@prisma/client/runtime/library").JsonValue | null;
            kraPin: string | null;
            vatNumber: string | null;
            etimsQrUrl: string | null;
            businessLicense: string | null;
            taxId: string | null;
            currency: string | null;
            timezone: string | null;
            invoiceFooter: string | null;
            credits: number | null;
            logoUrl: string | null;
            loginLogoUrl: string | null;
            favicon: string | null;
            receiptLogo: string | null;
            watermark: string | null;
            dashboardLogoUrl: string | null;
            emailLogoUrl: string | null;
            mobileLogoUrl: string | null;
            logoSettings: import("@prisma/client/runtime/library").JsonValue | null;
            primaryColor: string | null;
            secondaryColor: string | null;
            customDomain: string | null;
            whiteLabel: boolean;
            apiKey: string | null;
            webhookUrl: string | null;
            rateLimit: number | null;
            customIntegrations: boolean;
            ssoEnabled: boolean;
            auditLogsEnabled: boolean;
            backupRestore: boolean;
        };
        user: {
            id: string;
            email: string;
            name: string;
        };
        mpesaTransactions: {
            id: string;
            createdAt: Date;
            phoneNumber: string;
            amount: number;
            status: string;
            responseDesc: string | null;
            transactionId: string | null;
        }[];
        id: string;
        createdAt: Date;
        tenantId: string;
        userId: string;
        total: number;
        paymentType: string;
        customerName: string | null;
        customerPhone: string | null;
        mpesaTransactionId: string | null;
        idempotencyKey: string | null;
        vatAmount: number | null;
        branchId: string | null;
    }>;
    getSales(tenantId: string, page?: number, limit?: number): Promise<{
        data: {
            cashier: string | null;
            mpesaTransaction: {
                phoneNumber: string;
                amount: number;
                status: string;
            } | null;
            items: {
                productName: string;
                product: {
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    tenantId: string;
                    branchId: string | null;
                    description: string | null;
                    price: number;
                    customFields: import("@prisma/client/runtime/library").JsonValue | null;
                    sku: string;
                    stock: number;
                };
                id: string;
                saleId: string;
                price: number;
                productId: string;
                quantity: number;
            }[];
            user: {
                id: string;
                email: string;
                password: string;
                name: string;
                isSuperadmin: boolean;
                resetPasswordToken: string | null;
                resetPasswordExpires: Date | null;
                notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
                language: string | null;
                region: string | null;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string | null;
            };
            mpesaTransactions: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                userId: string | null;
                phoneNumber: string;
                amount: number;
                status: string;
                merchantRequestId: string | null;
                checkoutRequestID: string | null;
                mpesaReceipt: string | null;
                responseCode: string | null;
                responseDesc: string | null;
                message: string | null;
                saleId: string | null;
                saleData: import("@prisma/client/runtime/library").JsonValue | null;
                transactionId: string | null;
                transactionType: string | null;
                transactionTime: Date | null;
                businessShortCode: string | null;
                billRefNumber: string | null;
                invoiceNumber: string | null;
                orgAccountBalance: string | null;
                thirdPartyTransID: string | null;
            }[];
            id: string;
            createdAt: Date;
            tenantId: string;
            userId: string;
            total: number;
            paymentType: string;
            customerName: string | null;
            customerPhone: string | null;
            mpesaTransactionId: string | null;
            idempotencyKey: string | null;
            vatAmount: number | null;
            branchId: string | null;
        }[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    listSales(tenantId: string): Promise<{
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
    getAnalytics(tenantId: string): Promise<{
        totalSales: number;
        totalRevenue: number;
        avgSaleValue: number;
        topProducts: {
            id: string;
            name: string;
            unitsSold: number;
            revenue: number;
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
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            branchId: string | null;
            description: string | null;
            price: number;
            customFields: import("@prisma/client/runtime/library").JsonValue | null;
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
