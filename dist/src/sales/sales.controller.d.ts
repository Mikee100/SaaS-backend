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
                id: any;
                name: any;
                email: any;
            } | null;
            mpesaTransaction: {
                phoneNumber: any;
                amount: any;
                status: any;
                mpesaReceipt: any;
                message: any;
                transactionDate: any;
            } | null;
            items: any;
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
            amountReceived: number | null;
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
            cashier: any;
            mpesaTransaction: {
                phoneNumber: any;
                amount: any;
                status: any;
            } | null;
            items: any;
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
            description: string | null;
            createdAt: Date;
            tenantId: string;
            updatedAt: Date;
            branchId: string | null;
            isActive: boolean;
            sku: string;
            price: number;
            cost: number | null;
            barcode: string | null;
            quantity: number;
            minStock: number;
            categoryId: string | null;
        }[];
    }>;
    getReceipt(id: string, req: any): Promise<{
        id: string;
        saleId: string;
        date: Date;
        customerName: string;
        customerPhone: string;
        items: any;
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
            id: any;
            name: any;
            address: any;
        } | null;
    }>;
    getRecentSales(req: any): Promise<{
        id: string;
        total: number;
        paymentMethod: string;
        customerName: string | null;
        customerPhone: string | null;
        date: Date;
        items: any;
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
        cashier: any;
        mpesaTransaction: {
            phoneNumber: any;
            amount: any;
            status: any;
        } | null;
        items: any;
    }[]>;
    getSaleById(id: string, req: any): Promise<{
        saleId: string;
        cashier: {
            id: any;
            name: any;
            email: any;
        } | null;
        mpesaTransaction: {
            phoneNumber: any;
            amount: any;
            status: any;
            mpesaReceipt: any;
            message: any;
            transactionDate: any;
        } | null;
        items: any;
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
        amountReceived: number | null;
    }>;
}
