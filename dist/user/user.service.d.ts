import { PrismaService } from '../prisma.service';
export declare class UserService {
    private prisma;
    constructor(prisma: PrismaService);
    createUser(data: {
        email: string;
        password: string;
        name: string;
        role: string;
        tenantId: string;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        role: string;
        tenantId: string;
    }>;
    findByEmail(email: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        role: string;
        tenantId: string;
    } | null>;
    findAllByTenant(tenantId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        role: string;
        tenantId: string;
    }[]>;
    updateUser(id: string, data: {
        name?: string;
        role?: string;
    }, tenantId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    deleteUser(id: string, tenantId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
