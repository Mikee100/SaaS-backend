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
    getDailySales(tenantId: string): Promise<Record<string, number>>;
    getWeeklySales(tenantId: string): Promise<Record<string, number>>;
    getYearlySales(tenantId: string): Promise<Record<string, number>>;
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
    getBranchSales(tenantId: string, timeRange?: string, branchId?: string): Promise<{
        totalOrders: number;
        totalSales: number;
        averageOrderValue: number;
        topProducts: {
            productId: any;
            productName: any;
            quantitySold: number;
            totalRevenue: number;
        }[];
        paymentMethods: {
            method: any;
            count: number;
            amount: number;
        }[];
        salesTrend: {
            date: any;
            sales: number;
            orders: number;
        }[];
    }>;
    getBranchComparisonTimeSeries(tenantId: string, timeRange?: string): Promise<{
        timeRange: string;
        branches: unknown[];
        totals: {
            branchId: any;
            branchName: any;
            totalOrders: number;
            totalSales: number;
        }[];
        periodType: string;
    }>;
    getBranchProductComparison(tenantId: string, timeRange?: string): Promise<{
        timeRange: string;
        products: {
            productId: any;
            productName: any;
            totalQuantitySold: number;
            totalRevenue: number;
            totalOrders: number;
            branchCount: number;
            branchBreakdown: {
                branchId: any;
                branchName: any;
                quantitySold: number;
                totalRevenue: number;
                orderCount: number;
            }[];
        }[];
        branches: {
            branchId: any;
            branchName: any;
            totalOrders: number;
            totalSales: number;
        }[];
        summary: {
            totalProducts: number;
            totalBranches: number;
            totalRevenue: number;
            totalQuantitySold: number;
        };
    }>;
}
