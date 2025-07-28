import { PrismaService } from '../prisma.service';
export declare class PermissionService {
    private prisma;
    constructor(prisma: PrismaService);
    getAllPermissions(): Promise<{
        id: string;
        description: string | null;
        key: string;
    }[]>;
    createPermission(key: string, description?: string): Promise<{
        id: string;
        description: string | null;
        key: string;
    }>;
    getAllRoles(): Promise<{
        id: string;
        name: string;
        description: string | null;
    }[]>;
    createRole(name: string, description?: string): Promise<{
        id: string;
        name: string;
        description: string | null;
    }>;
    getRolePermissions(roleId: string): Promise<({
        permission: {
            id: string;
            description: string | null;
            key: string;
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
            description: string | null;
            key: string;
        };
    } & {
        id: string;
        roleId: string;
        permissionId: string;
    })[]>;
}
