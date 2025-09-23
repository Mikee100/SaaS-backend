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
    getSales(tenantId: string, page?: number, limit?: number): Promise<{
        data: {
            cashier: any;
            mpesaTransaction: {
                phoneNumber: any;
                amount: any;
                status: any;
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
        cashier: any;
        mpesaTransaction: {
            phoneNumber: any;
            amount: any;
            status: any;
        } | null;
        items: any;
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
        items: any;
    }[]>;
}
