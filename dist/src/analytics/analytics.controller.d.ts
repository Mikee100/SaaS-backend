import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private analyticsService;
    constructor(analyticsService: AnalyticsService);
    getBasicAnalytics(req: any): Promise<{
        totalSales: any;
        totalRevenue: any;
        totalProducts: any;
        message: string;
    }>;
    getDashboardAnalytics(req: any): Promise<{
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
    getAdvancedAnalytics(req: any): Promise<{
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
    getEnterpriseAnalytics(req: any): Promise<{
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
}
