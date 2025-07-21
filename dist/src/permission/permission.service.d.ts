import { PrismaService } from '../prisma.service';
export declare class PermissionService {
    private prisma;
    constructor(prisma: PrismaService);
    getAllPermissions(): Promise<{
        id: string;
        key: string;
        description: string | null;
    }[]>;
    createPermission(key: string, description?: string): Promise<{
        id: string;
        key: string;
        description: string | null;
    }>;
    getAllRoles(): Promise<{
        id: string;
        description: string | null;
        name: string;
    }[]>;
    createRole(name: string, description?: string): Promise<{
        id: string;
        description: string | null;
        name: string;
    }>;
    getRolePermissions(roleId: string): Promise<({
        permission: {
            id: string;
            key: string;
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
        permission: {
            id: string;
            key: string;
            description: string | null;
        };
    } & {
        id: string;
        roleId: string;
        permissionId: string;
    })[]>;
}
