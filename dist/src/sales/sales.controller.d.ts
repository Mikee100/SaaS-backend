import { SalesService } from './sales.service';
import { CreateSaleDto } from './create-sale.dto';
export declare class SalesController {
    private readonly salesService;
    constructor(salesService: SalesService);
    test(): Promise<{
        message: string;
    }>;
    testSale(id: string): Promise<{
        message: string;
        sale: {
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
                quantity: number;
                saleId: string;
            }[];
            tenant: {
                id: string;
                name: string;
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
                stripeCustomerId: string | null;
                createdAt: Date;
                updatedAt: Date;
            };
            mpesaTransactions: {
                id: string;
                createdAt: Date;
                status: string;
                amount: number;
                phoneNumber: string;
                responseDesc: string | null;
                transactionId: string | null;
            }[];
            user: {
                id: string;
                name: string;
                email: string;
            };
            branch: {
                id: string;
                name: string;
                address: string | null;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
            } | null;
            id: string;
            createdAt: Date;
            tenantId: string;
            userId: string;
            branchId: string | null;
            total: number;
            paymentType: string;
            customerName: string | null;
            customerPhone: string | null;
            mpesaTransactionId: string | null;
            idempotencyKey: string | null;
            vatAmount: number | null;
        };
        error?: undefined;
    } | {
        message: string;
        error: any;
        sale?: undefined;
    }>;
    testDb(): Promise<{
        message: string;
        salesCount: number;
        sales: {
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
        }[];
        error?: undefined;
    } | {
        message: string;
        error: any;
        salesCount?: undefined;
        sales?: undefined;
    }>;
    getAnalytics(req: any): Promise<{
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
            description: string | null;
            price: number;
            customFields: import("@prisma/client/runtime/library").JsonValue | null;
            sku: string;
            cost: number;
            stock: number;
            branchId: string | null;
        }[];
    }>;
    getReceipt(id: string, req: any): Promise<{
        id: string;
        saleId: string;
        date: Date;
        customerName: string;
        customerPhone: string;
        items: {
            productId: string;
            name: string;
            price: number;
            quantity: number;
            total: number;
        }[];
        subtotal: number;
        total: number;
        vatAmount: number;
        paymentMethod: string;
        amountReceived: number;
        change: number;
        businessInfo: {
            name: string;
            address: string;
            phone: string;
            email: string;
        };
        mpesaTransaction: {
            phoneNumber: string;
            amount: number;
            status: string;
            mpesaReceipt: string | null;
            message: string;
            transactionDate: Date;
        } | null;
    }>;
    getRecentSales(req: any): Promise<{
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
    createSale(dto: CreateSaleDto & {
        idempotencyKey: string;
    }, req: any): Promise<import("./sale-receipt.dto").SaleReceiptDto>;
    listSales(req: any): Promise<{
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
    getSaleById(id: string, req: any): Promise<{
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
            quantity: number;
            saleId: string;
        }[];
        tenant: {
            id: string;
            name: string;
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
            stripeCustomerId: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        mpesaTransactions: {
            id: string;
            createdAt: Date;
            status: string;
            amount: number;
            phoneNumber: string;
            responseDesc: string | null;
            transactionId: string | null;
        }[];
        user: {
            id: string;
            name: string;
            email: string;
        };
        branch: {
            id: string;
            name: string;
            address: string | null;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
        } | null;
        id: string;
        createdAt: Date;
        tenantId: string;
        userId: string;
        branchId: string | null;
        total: number;
        paymentType: string;
        customerName: string | null;
        customerPhone: string | null;
        mpesaTransactionId: string | null;
        idempotencyKey: string | null;
        vatAmount: number | null;
    }>;
}
