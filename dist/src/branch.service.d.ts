import { PrismaService } from './prisma.service';
export declare class BranchService {
    private prisma;
    constructor(prisma: PrismaService);
    createBranch(data: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        tenantId: string;
        updatedAt: Date;
        email: string | null;
        isActive: boolean;
        address: string | null;
        city: string | null;
        country: string | null;
        postalCode: string | null;
        state: string | null;
        isMainBranch: boolean;
        phone: string | null;
    }>;
    findAllByTenant(tenantId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        tenantId: string;
        updatedAt: Date;
        email: string | null;
        isActive: boolean;
        address: string | null;
        city: string | null;
        country: string | null;
        postalCode: string | null;
        state: string | null;
        isMainBranch: boolean;
        phone: string | null;
    }[]>;
    findById(id: string, tenantId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        tenantId: string;
        updatedAt: Date;
        email: string | null;
        isActive: boolean;
        address: string | null;
        city: string | null;
        country: string | null;
        postalCode: string | null;
        state: string | null;
        isMainBranch: boolean;
        phone: string | null;
    } | null>;
    updateBranch(id: string, data: any, tenantId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    deleteBranch(id: string, tenantId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
