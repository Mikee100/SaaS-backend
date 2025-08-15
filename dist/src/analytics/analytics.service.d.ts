import { PrismaService } from '../prisma.service';
export interface SalesAnalytics {
    totalSales: number;
    totalRevenue: number;
    averageOrderValue: number;
    salesTrend: Array<{
        date: string;
        amount: number;
    }>;
    topProducts: Array<{
        id: string;
        name: string;
        revenue: number;
        quantity: number;
        cost: number;
        margin: number;
    }>;
}
export interface InventoryAnalytics {
    totalProducts: number;
    totalValue: number;
    lowStockItems: number;
    outOfStockItems: number;
}
export declare class AnalyticsService {
    private prisma;
    constructor(prisma: PrismaService);
    getSalesAnalytics(tenantId: string): Promise<SalesAnalytics>;
    getInventoryAnalytics(tenantId: string): Promise<InventoryAnalytics>;
}
