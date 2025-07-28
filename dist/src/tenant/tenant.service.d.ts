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
    getTenantById(tenantId: string): Promise<{
        id: string;
        name: string;
        currency: string | null;
        createdAt: Date;
        updatedAt: Date;
        businessType: string;
        contactEmail: string;
        contactPhone: string | null;
        address: string | null;
        timezone: string | null;
        invoiceFooter: string | null;
        logoUrl: string | null;
        kraPin: string | null;
        vatNumber: string | null;
        etimsQrUrl: string | null;
    } | null>;
    updateTenant(tenantId: string, dto: any): Promise<{
        id: string;
        name: string;
        currency: string | null;
        createdAt: Date;
        updatedAt: Date;
        businessType: string;
        contactEmail: string;
        contactPhone: string | null;
        address: string | null;
        timezone: string | null;
        invoiceFooter: string | null;
        logoUrl: string | null;
        kraPin: string | null;
        vatNumber: string | null;
        etimsQrUrl: string | null;
    }>;
}
