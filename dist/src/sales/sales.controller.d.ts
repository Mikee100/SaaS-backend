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
            user: {
                id: string;
                name: string;
                email: string;
            };
            mpesaTransactions: {
                id: string;
                createdAt: Date;
                status: string;
                phoneNumber: string;
                amount: number;
                responseDesc: string | null;
                transactionId: string | null;
            }[];
            tenant: {
                id: string;
                createdAt: Date;
                name: string;
                updatedAt: Date;
                address: string | null;
                city: string | null;
                state: string | null;
                country: string | null;
                postalCode: string | null;
                businessType: string;
                contactEmail: string;
                contactPhone: string | null;
                businessCategory: string | null;
                businessSubcategory: string | null;
                primaryProducts: import("@prisma/client/runtime/library").JsonValue | null;
                secondaryProducts: import("@prisma/client/runtime/library").JsonValue | null;
                businessDescription: string | null;
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
            };
            branch: {
                id: string;
                createdAt: Date;
                name: string;
                email: string | null;
                updatedAt: Date;
                tenantId: string;
                address: string | null;
                street: string | null;
                city: string | null;
                state: string | null;
                country: string | null;
                postalCode: string | null;
                phone: string | null;
                manager: string | null;
                openingHours: string | null;
                status: string | null;
                logo: string | null;
                customField: string | null;
            } | null;
            id: string;
            userId: string;
            createdAt: Date;
            tenantId: string;
            branchId: string | null;
            total: number;
            paymentType: string;
            amountReceived: number | null;
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
        }[];
        total: number;
        paymentMethod: string;
        amountReceived: number | null;
        change: number;
        businessInfo: {
            name: string;
            address: string | null;
            phone: string | null;
            email: string;
        };
        branch: {
            id: string;
            name: string;
            address: string | null;
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
    create(createSaleDto: CreateSaleDto, req: any): Promise<{
        success: boolean;
        data: import("./sale-receipt.dto").SaleReceiptDto;
        message: string;
    }>;
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
        user: {
            id: string;
            name: string;
            email: string;
        };
        mpesaTransactions: {
            id: string;
            createdAt: Date;
            status: string;
            phoneNumber: string;
            amount: number;
            responseDesc: string | null;
            transactionId: string | null;
        }[];
        tenant: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            address: string | null;
            city: string | null;
            state: string | null;
            country: string | null;
            postalCode: string | null;
            businessType: string;
            contactEmail: string;
            contactPhone: string | null;
            businessCategory: string | null;
            businessSubcategory: string | null;
            primaryProducts: import("@prisma/client/runtime/library").JsonValue | null;
            secondaryProducts: import("@prisma/client/runtime/library").JsonValue | null;
            businessDescription: string | null;
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
        };
        branch: {
            id: string;
            createdAt: Date;
            name: string;
            email: string | null;
            updatedAt: Date;
            tenantId: string;
            address: string | null;
            street: string | null;
            city: string | null;
            state: string | null;
            country: string | null;
            postalCode: string | null;
            phone: string | null;
            manager: string | null;
            openingHours: string | null;
            status: string | null;
            logo: string | null;
            customField: string | null;
        } | null;
        id: string;
        userId: string;
        createdAt: Date;
        tenantId: string;
        branchId: string | null;
        total: number;
        paymentType: string;
        amountReceived: number | null;
        customerName: string | null;
        customerPhone: string | null;
        mpesaTransactionId: string | null;
        idempotencyKey: string | null;
        vatAmount: number | null;
    }>;
}
