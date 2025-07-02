import { PrismaService } from '../prisma.service';
export declare class TenantService {
    private prisma;
    constructor(prisma: PrismaService);
    createTenant(data: {
        name: string;
        businessType: string;
        contactEmail: string;
        contactPhone?: string;
    }): Promise<any>;
    getAllTenants(): Promise<any[]>;
}
