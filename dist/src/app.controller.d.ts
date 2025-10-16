import { PrismaService } from './prisma.service';
export declare class AppController {
    private prisma;
    constructor(prisma: PrismaService);
    getRoot(): {
        message: string;
    };
    getDashboardStats(req: any): Promise<{
        totalSales: number;
        totalProducts: number;
        totalCustomers: number;
        totalRevenue: number;
        monthlyRevenue: number;
        recentActivity: {
            sales: {
                id: string;
                amount: number;
                customer: string;
                date: Date;
                user: string;
            }[];
            products: {
                id: string;
                name: string;
                price: number;
                date: Date;
            }[];
        };
    }>;
    getUsageStats(req: any): Promise<{
        users: {
            current: number;
            limit: number;
        };
        products: {
            current: number;
            limit: number;
        };
        sales: {
            current: number;
            limit: number;
        };
    }>;
}
