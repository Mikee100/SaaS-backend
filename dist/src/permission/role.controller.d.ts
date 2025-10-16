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
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
    getRoles(req: any): Promise<({
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
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    })[]>;
    updateRole(body: any): Promise<void>;
    getRolePermissions(id: string): Promise<({
        role: {
            id: string;
            tenantId: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
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
    updateRolePermissions(id: string, body: any): Promise<({
        role: {
            id: string;
            tenantId: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
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
}
