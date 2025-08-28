import { PrismaService } from './prisma.service';
export declare class UsageController {
    private prisma;
    constructor(prisma: PrismaService);
    getStats(req: any): Promise<{
        products: {
            current: number;
            limit: number;
        };
    }>;
}
