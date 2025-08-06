export declare class AnalyticsController {
    getBasicAnalytics(req: any): Promise<{
        totalSales: number;
        totalRevenue: number;
        totalProducts: number;
        totalCustomers: number;
        averageOrderValue: number;
        conversionRate: number;
        salesByMonth: {
            '2024-01': number;
            '2024-02': number;
            '2024-03': number;
            '2024-04': number;
            '2024-05': number;
            '2024-06': number;
        };
        topProducts: {
            name: string;
            sales: number;
            revenue: number;
            growth: number;
        }[];
        customerSegments: {
            segment: string;
            count: number;
            revenue: number;
            avgOrderValue: number;
        }[];
        salesByCategory: {
            Electronics: number;
            Clothing: number;
            'Home & Garden': number;
            Sports: number;
        };
        message: string;
    }>;
    getAdvancedAnalytics(req: any): Promise<{
        salesByMonth: {
            '2024-01': number;
            '2024-02': number;
            '2024-03': number;
            '2024-04': number;
            '2024-05': number;
            '2024-06': number;
        };
        topProducts: {
            name: string;
            sales: number;
            revenue: number;
            growth: number;
            margin: number;
        }[];
        customerSegments: {
            segment: string;
            count: number;
            revenue: number;
            avgOrderValue: number;
            retention: number;
        }[];
        predictiveAnalytics: {
            nextMonthForecast: number;
            churnRisk: number;
            growthRate: number;
            seasonalTrend: number;
            marketTrend: number;
        };
        performanceMetrics: {
            customerLifetimeValue: number;
            customerAcquisitionCost: number;
            returnOnInvestment: number;
            netPromoterScore: number;
        };
        inventoryAnalytics: {
            lowStockItems: number;
            overstockItems: number;
            inventoryTurnover: number;
            stockoutRate: number;
        };
        message: string;
    }>;
    getEnterpriseAnalytics(req: any): Promise<{
        realTimeData: {
            currentUsers: number;
            activeSales: number;
            revenueToday: number;
            ordersInProgress: number;
            averageSessionDuration: number;
            bounceRate: number;
        };
        predictiveAnalytics: {
            nextMonthForecast: number;
            churnRisk: number;
            growthRate: number;
            seasonalTrend: number;
            marketTrend: number;
            demandForecast: {
                'Product A': number;
                'Product B': number;
                'Product C': number;
                'Product D': number;
            };
        };
        advancedSegments: {
            byLocation: {
                location: string;
                revenue: number;
                customers: number;
            }[];
            byAge: {
                age: string;
                revenue: number;
                customers: number;
            }[];
            byDevice: {
                device: string;
                revenue: number;
                customers: number;
            }[];
        };
        customReports: {
            name: string;
            data: string;
            lastUpdated: string;
        }[];
        aiInsights: {
            recommendations: string[];
            anomalies: string[];
        };
        message: string;
    }>;
    getDashboardStats(req: any): Promise<{
        totalSales: number;
        totalRevenue: number;
        totalProducts: number;
        totalCustomers: number;
        averageOrderValue: number;
        conversionRate: number;
        recentActivity: {
            sales: {
                amount: number;
                customer: string;
                date: string;
            }[];
            products: {
                name: string;
                date: string;
            }[];
        };
        customerGrowth: {
            '2024-01': number;
            '2024-02': number;
            '2024-03': number;
            '2024-04': number;
            '2024-05': number;
            '2024-06': number;
        };
        topProducts: {
            name: string;
            sales: number;
            revenue: number;
        }[];
    }>;
}
