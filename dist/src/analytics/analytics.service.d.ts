import { PrismaService } from '../prisma.service';
export declare class AnalyticsService {
    private prisma;
    constructor(prisma: PrismaService);
    getDashboardAnalytics(tenantId: string): Promise<{
        aiSummary: string;
        totalSales: number;
        totalRevenue: number;
        totalProducts: number;
        totalCustomers: number;
        salesByDay: Record<string, number>;
        salesByWeek: Record<string, number>;
        salesByMonth: Record<string, number>;
        topProducts: {
            name: string;
            sales: number | null;
            revenue: number;
            margin: number;
            cost: number;
        }[];
        customerRetention: {
            totalCustomers: number;
            repeatCustomers: number;
            retentionRate: number;
        };
        inventoryAnalytics: {
            lowStockItems: number;
            overstockItems: number;
            inventoryTurnover: number;
            stockoutRate: number;
            totalStockValue: number;
        };
        performanceMetrics: {
            customerLifetimeValue: number;
            customerAcquisitionCost: number;
            returnOnInvestment: number;
            netPromoterScore: number;
        };
        realTimeData: {
            currentUsers: number;
            activeSales: number;
            revenueToday: number;
            ordersInProgress: number;
            averageSessionDuration: number;
            bounceRate: number;
        };
        forecast: {
            forecast_months: string[];
            forecast_sales: number[];
        };
        anomalies: any;
        customerSegmentsAI: any;
        churnPrediction: any;
    }>;
    private getSalesByTimePeriod;
    private getTopProducts;
    private getInventoryAnalytics;
    private getCostOfGoodsSold;
    private getRepeatCustomers;
    private calculatePerformanceMetrics;
    private getRealTimeData;
    private generateSalesForecast;
    private getAnomaliesData;
    private getCustomerSegmentsData;
    private getChurnPredictionData;
}
