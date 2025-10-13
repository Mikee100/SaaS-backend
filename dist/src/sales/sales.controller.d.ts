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
            })[];
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
        amountReceived: number;
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
            address: string;
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
        })[];
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
