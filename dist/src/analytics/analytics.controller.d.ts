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
    getAdvancedAnalytics(req: any): Promise<{
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
    getEnterpriseAnalytics(req: any): Promise<{
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
    getDailySales(req: any): Promise<Record<string, number>>;
    getWeeklySales(req: any): Promise<Record<string, number>>;
    getYearlySales(req: any): Promise<Record<string, number>>;
    getBranchSales(req: any): Promise<{
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
    getBranchComparisonTimeSeries(req: any): Promise<{
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
    getBranchProductComparison(req: any): Promise<{
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
