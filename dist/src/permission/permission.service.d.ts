import { PrismaService } from '../prisma.service';
export declare class PermissionService {
    private prisma;
    constructor(prisma: PrismaService);
    getAllPermissions(): Promise<{
        id: string;
        name: string;
        description: string | null;
    }[]>;
    createPermission(key: string, description?: string): Promise<{
        id: string;
        name: string;
        description: string | null;
    }>;
    getAllRoles(currentUserRole?: string, tenantId?: string): Promise<({
        permissions: ({
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
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
    })[]>;
    updateRole(name: string, description?: string): Promise<void>;
    createRole(name: string, description?: string, tenantId?: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
    }>;
    getRolePermissions(roleId: string): Promise<({
        permission: {
            id: string;
            name: string;
            description: string | null;
        };
        role: {
            id: string;
            name: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string | null;
        };
    } & {
        id: string;
        roleId: string;
        permissionId: string;
    })[]>;
    updateRolePermissions(roleId: string, permissions: {
        key: string;
    }[]): Promise<({
        permission: {
            id: string;
            name: string;
            description: string | null;
        };
        role: {
            id: string;
            name: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string | null;
        };
    } & {
        id: string;
        roleId: string;
        permissionId: string;
    })[]>;
}
