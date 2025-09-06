import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private analyticsService;
    constructor(analyticsService: AnalyticsService);
    getBasicAnalytics(req: any): Promise<{
        totalSales: number;
        totalRevenue: number;
        totalProducts: number;
        message: string;
    }>;
    getDashboardAnalytics(req: any): Promise<{
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
    }>;
    getAdvancedAnalytics(req: any): Promise<{
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
    }>;
    getEnterpriseAnalytics(req: any): Promise<{
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
    }>;
}
