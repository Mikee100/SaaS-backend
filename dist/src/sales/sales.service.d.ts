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
            variationId: string | null;
        }[];
        branch: {
            id: string;
            name: string;
            address: string | null;
        } | null;
        Branch: {
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
        Tenant: {
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
            postalCode: string | null;
            primaryColor: string | null;
            primaryProducts: Prisma.JsonValue | null;
            rateLimit: number | null;
            receiptLogo: string | null;
            secondaryColor: string | null;
            secondaryProducts: Prisma.JsonValue | null;
            socialMedia: Prisma.JsonValue | null;
            ssoEnabled: boolean;
            state: string | null;
            stripeCustomerId: string | null;
            watermark: string | null;
            webhookUrl: string | null;
            whiteLabel: boolean;
            dashboardLogoUrl: string | null;
            emailLogoUrl: string | null;
            loginLogoUrl: string | null;
            logoSettings: Prisma.JsonValue | null;
            pdfTemplate: Prisma.JsonValue | null;
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
        User: {
            id: string;
            name: string;
            email: string;
        };
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
            variationId: string | null;
        })[];
        id: string;
        createdAt: Date;
        tenantId: string;
        branchId: string | null;
        userId: string;
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
    getCredits(tenantId: string): Promise<({
        sale: {
            id: string;
            createdAt: Date;
            total: number;
            SaleItem: {
                price: number;
                product: {
                    id: string;
                    name: string;
                };
                quantity: number;
            }[];
        };
        payments: {
            id: string;
            createdAt: Date;
            paymentMethod: string;
            amount: number;
            transactionId: string | null;
            notes: string | null;
            creditId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        status: string;
        dueDate: Date | null;
        customerName: string;
        customerPhone: string | null;
        saleId: string;
        notes: string | null;
        customerEmail: string | null;
        totalAmount: number;
        paidAmount: number;
        balance: number;
    })[]>;
    getCreditById(id: string, tenantId: string): Promise<({
        sale: {
            id: string;
            createdAt: Date;
            total: number;
            SaleItem: {
                price: number;
                product: {
                    id: string;
                    name: string;
                };
                quantity: number;
            }[];
        };
        payments: {
            id: string;
            createdAt: Date;
            paymentMethod: string;
            amount: number;
            transactionId: string | null;
            notes: string | null;
            creditId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        status: string;
        dueDate: Date | null;
        customerName: string;
        customerPhone: string | null;
        saleId: string;
        notes: string | null;
        customerEmail: string | null;
        totalAmount: number;
        paidAmount: number;
        balance: number;
    }) | null>;
    makeCreditPayment(creditId: string, amount: number, paymentMethod: string, tenantId: string, notes?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        status: string;
        dueDate: Date | null;
        customerName: string;
        customerPhone: string | null;
        saleId: string;
        notes: string | null;
        customerEmail: string | null;
        totalAmount: number;
        paidAmount: number;
        balance: number;
    }>;
    getCustomerCreditBalance(tenantId: string, customerName: string, customerPhone?: string): Promise<{
        totalOutstanding: number;
        totalCredit: number;
        totalPaid: number;
        activeCredits: number;
        hasOverdue: boolean;
        credits: {
            balance: number;
            totalAmount: number;
            paidAmount: number;
            status: string;
            dueDate: Date | null;
        }[];
    }>;
    calculateCustomerCreditScore(tenantId: string, customerName: string, customerPhone?: string): Promise<{
        score: number;
        riskLevel: string;
        factors: {
            totalCredits: number;
            paidCredits: number;
            overdueCredits: number;
            averagePaymentDays: number;
            totalCreditAmount: number;
        };
    }>;
    setTenantCreditPolicy(tenantId: string, maxCreditPerCustomer: number, maxOverdueDays?: number): Promise<{
        maxCreditPerCustomer: number;
        maxOverdueDays: number;
    }>;
    getTenantCreditPolicy(tenantId: string): Promise<any>;
    checkCreditEligibility(tenantId: string, customerName: string, requestedAmount: number, customerPhone?: string): Promise<{
        isEligible: boolean;
        availableCredit: number;
        requestedAmount: number;
        currentOutstanding: number;
        creditScore: number;
        riskLevel: string;
        reasons: string[];
    }>;
    getCrossTenantCreditReport(): Promise<Record<string, any>>;
    getCreditAnalytics(tenantId: string, startDate?: Date, endDate?: Date): Promise<{
        summary: {
            totalCredits: number;
            totalOutstanding: number;
            totalPaid: number;
            totalCreditAmount: number;
            paidCredits: number;
            overdueCredits: number;
            activeCredits: number;
            avgPaymentTime: number;
        };
        trends: {
            paymentTrends: Record<string, number>;
            outstandingByMonth: Record<string, number>;
            overdueByMonth: Record<string, number>;
        };
    }>;
    getCustomerCreditHistory(tenantId: string, customerName: string, customerPhone?: string): Promise<{
        customer: {
            name: string;
            phone: string | undefined;
        };
        summary: {
            totalCredits: number;
            totalCreditAmount: number;
            totalPaid: number;
            totalOutstanding: number;
            paidCredits: number;
            overdueCredits: number;
            paymentRatio: number;
        };
        creditHistory: {
            id: string;
            saleId: string;
            totalAmount: number;
            paidAmount: number;
            balance: number;
            status: string;
            dueDate: Date | null;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            sale: {
                id: string;
                total: number;
                createdAt: Date;
                items: {
                    productId: string;
                    productName: string;
                    quantity: number;
                    price: number;
                    total: number;
                }[];
            } | null;
            payments: {
                id: string;
                amount: number;
                paymentMethod: string;
                notes: string | null;
                createdAt: Date;
            }[];
        }[];
    }>;
    getCreditAgingAnalysis(tenantId: string): Promise<{
        summary: {
            current: number;
            '31-60': number;
            '61-90': number;
            '91+': number;
        };
        details: {
            current: any[];
            '31-60': any[];
            '61-90': any[];
            '91+': any[];
        };
        totalOutstanding: number;
    }>;
}
export {};
