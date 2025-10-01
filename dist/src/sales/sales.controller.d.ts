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
        sale: any;
        error?: undefined;
    } | {
        message: string;
        error: any;
        sale?: undefined;
    }>;
    testDb(): Promise<{
        message: string;
        salesCount: any;
        sales: any;
        error?: undefined;
    } | {
        message: string;
        error: any;
        salesCount?: undefined;
        sales?: undefined;
    }>;
    getAnalytics(req: any): Promise<{
        totalSales: number;
        totalRevenue: any;
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
        lowStock: any;
    }>;
    getReceipt(id: string, req: any): Promise<{
        id: any;
        saleId: any;
        date: any;
        customerName: any;
        customerPhone: any;
        items: any;
        total: any;
        paymentMethod: any;
        amountReceived: any;
        change: number;
        businessInfo: {
            name: any;
            address: any;
            phone: any;
            email: any;
        };
        branch: {
            id: any;
            name: any;
            address: any;
        } | null;
    }>;
    getRecentSales(req: any): Promise<any>;
    create(createSaleDto: CreateSaleDto, req: any): Promise<{
        success: boolean;
        data: import("./sale-receipt.dto").SaleReceiptDto;
        message: string;
    }>;
    listSales(req: any): Promise<any>;
    getSaleById(id: string, req: any): Promise<any>;
}
