import { PrismaService } from '../prisma.service';
import { CreateSaleDto } from './create-sale.dto';
import { SaleReceiptDto } from './sale-receipt.dto';
import { AuditLogService } from '../audit-log.service';
import { RealtimeGateway } from '../realtime.gateway';
export declare class SalesService {
    private prisma;
    private auditLogService;
    private realtimeGateway;
    constructor(prisma: PrismaService, auditLogService: AuditLogService, realtimeGateway: RealtimeGateway);
    createSale(dto: CreateSaleDto & {
        mpesaTransactionId?: string;
        idempotencyKey: string;
    }, tenantId: string, userId: string): Promise<SaleReceiptDto>;
    getSaleById(id: string, tenantId: string): Promise<{
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
            mpesaReceipt: string | null;
            message: string | null;
        } | null;
        items: {
            productId: string;
            name: string;
            price: number;
            quantity: number;
        }[];
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
            mpesaReceipt: string | null;
            message: string | null;
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
            tenantId: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            price: number;
            sku: string;
            description: string | null;
            stock: number;
            customFields: import("@prisma/client/runtime/library").JsonValue | null;
        }[];
    }>;
}
