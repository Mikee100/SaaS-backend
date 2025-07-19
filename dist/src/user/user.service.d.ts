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
        email: string;
        password: string;
        name: string;
        role: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findByEmail(email: string): Promise<{
        id: string;
        email: string;
        password: string;
        name: string;
        role: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    findAllByTenant(tenantId: string): Promise<{
        id: string;
        email: string;
        password: string;
        name: string;
        role: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    updateUser(id: string, data: {
        name?: string;
        role?: string;
    }, tenantId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    updateUserPermissions(userId: string, permissions: Array<{
        key: string;
        note?: string;
    }>, grantedBy?: string): Promise<({
        permissions: ({
            permission: {
                id: string;
                key: string;
                description: string | null;
            };
        } & {
            id: string;
            userId: string;
            permissionId: string;
            grantedBy: string | null;
            grantedAt: Date | null;
            note: string | null;
        })[];
    } & {
        id: string;
        email: string;
        password: string;
        name: string;
        role: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    deleteUser(id: string, tenantId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    getUserPermissions(userId: string): Promise<({
        permission: {
            id: string;
            key: string;
            description: string | null;
        };
    } & {
        id: string;
        userId: string;
        permissionId: string;
        grantedBy: string | null;
        grantedAt: Date | null;
        note: string | null;
    })[]>;
}
