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
    getSaleById(id: string, tenantId: string): Promise<any>;
    getSales(tenantId: string, page?: number, limit?: number): Promise<{
        data: TransformedSale[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    listSales(tenantId: string, limit?: number): Promise<any>;
    getAnalytics(tenantId: string, startDate?: Date, endDate?: Date): Promise<{
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
    getTenantInfo(tenantId: string): Promise<any>;
    getRecentSales(tenantId: string, limit?: number): Promise<any>;
}
export {};
