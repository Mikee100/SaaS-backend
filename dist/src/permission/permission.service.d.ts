import { PrismaService } from '../prisma.service';
export declare class PermissionService {
    private prisma;
    constructor(prisma: PrismaService);
    getAllPermissions(): Promise<{
        id: string;
        name: string;
        description: string | null;
    }[]>;
    createPermission(name: string, description: string): Promise<{
        id: string;
        name: string;
        description: string | null;
    }>;
    getAllRoles(): Promise<({
        rolePermissions: ({
            permission: {
                id: string;
                name: string;
                description: string | null;
            };
        } & {
            id: string;
            roleId: string;
            permissionId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        tenantId: string | null;
        description: string | null;
    })[]>;
    createRole(name: string, description?: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        tenantId: string | null;
        description: string | null;
    }>;
    getRolePermissions(roleId: string): Promise<({
        role: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            tenantId: string | null;
            description: string | null;
        };
        permission: {
            id: string;
            name: string;
            description: string | null;
        };
    } & {
        id: string;
        roleId: string;
        permissionId: string;
    })[]>;
    updateRolePermissions(roleId: string, permissionNames: string[]): Promise<{
        id: string;
        roleId: string;
        permissionId: string;
    }[]>;
}
