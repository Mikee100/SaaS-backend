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
        updatedAt: Date;
        tenantId: string | null;
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
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
    })[]>;
    updateRole(body: any): Promise<void>;
    getRolePermissions(id: string): Promise<({
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
    updateRolePermissions(id: string, body: any): Promise<({
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
