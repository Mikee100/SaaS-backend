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
    getAllRoles(): Promise<{
        id: string;
        name: string;
        description: string | null;
        isSystemRole: boolean;
        createdAt: Date;
        tenantId: string | null;
        updatedAt: Date;
    }[]>;
    updateRole(name: string, description?: string): Promise<void>;
    createRole(name: string, description?: string): Promise<void>;
    getRolePermissions(roleId: string): Promise<({
        role: {
            id: string;
            name: string;
            description: string | null;
            isSystemRole: boolean;
            createdAt: Date;
            tenantId: string | null;
            updatedAt: Date;
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
    updateRolePermissions(roleId: string, permissions: {
        key: string;
    }[]): Promise<({
        role: {
            id: string;
            name: string;
            description: string | null;
            isSystemRole: boolean;
            createdAt: Date;
            tenantId: string | null;
            updatedAt: Date;
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
}
