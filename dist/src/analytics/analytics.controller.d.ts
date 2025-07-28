export declare class AnalyticsController {
    getBasicAnalytics(req: any): Promise<{
        totalSales: number;
        totalRevenue: number;
        totalProducts: number;
        message: string;
    }>;
    getAdvancedAnalytics(req: any): Promise<{
        salesByMonth: {
            '2024-01': number;
            '2024-02': number;
            '2024-03': number;
        };
        topProducts: {
            name: string;
            sales: number;
            revenue: number;
        }[];
        customerSegments: {
            segment: string;
            count: number;
            revenue: number;
        }[];
        message: string;
    }>;
    getEnterpriseAnalytics(req: any): Promise<{
        realTimeData: {
            currentUsers: number;
            activeSales: number;
            revenueToday: number;
        };
        predictiveAnalytics: {
            nextMonthForecast: number;
            churnRisk: number;
            growthRate: number;
        };
        customReports: {
            name: string;
            data: string;
        }[];
        message: string;
    }>;
}
