import { PermissionService } from './permission.service';
export declare class RoleController {
    private readonly permissionService;
    constructor(permissionService: PermissionService);
    createRole(body: {
        name: string;
        description?: string;
        tenantId: string;
    }): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        tenantId: string | null;
        updatedAt: Date;
    }>;
    getRoles(): Promise<({
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
        tenantId: string | null;
        updatedAt: Date;
    })[]>;
    updateRole(body: any): Promise<void>;
    getRolePermissions(id: string): Promise<({
        role: {
            id: string;
            name: string;
            description: string | null;
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
    updateRolePermissions(id: string, body: any): Promise<({
        role: {
            id: string;
            name: string;
            description: string | null;
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
