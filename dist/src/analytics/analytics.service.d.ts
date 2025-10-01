import { PrismaService } from '../prisma.service';
export declare class AnalyticsService {
    private prisma;
    constructor(prisma: PrismaService);
    getDashboardAnalytics(tenantId: string): Promise<{
        aiSummary: string;
        totalSales: any;
        totalRevenue: any;
        totalProducts: any;
        totalCustomers: any;
        salesByDay: any;
        salesByWeek: any;
        salesByMonth: any;
        topProducts: any;
        customerRetention: {
            totalCustomers: any;
            repeatCustomers: number;
            retentionRate: number;
        };
        inventoryAnalytics: any;
        performanceMetrics: {
            customerLifetimeValue: number;
            customerAcquisitionCost: number;
            returnOnInvestment: number;
            netPromoterScore: number;
        };
        realTimeData: {
            currentUsers: any;
            activeSales: any;
            revenueToday: any;
            ordersInProgress: any;
            averageSessionDuration: number;
            bounceRate: number;
        };
        forecast: any;
    }>;
    private getSalesByTimePeriod;
    private getTopProducts;
    private getInventoryAnalytics;
    private getCostOfGoodsSold;
    private getRepeatCustomers;
    private calculatePerformanceMetrics;
    private getRealTimeData;
    private generateSalesForecast;
}
