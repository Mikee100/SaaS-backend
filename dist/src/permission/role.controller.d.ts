import { PermissionService } from './permission.service';
export declare class RoleController {
    private readonly permissionService;
    constructor(permissionService: PermissionService);
    getRoles(): Promise<({
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
    createRole(body: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        tenantId: string | null;
        description: string | null;
    }>;
    getRolePermissions(id: string): Promise<({
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
    updateRolePermissions(id: string, body: any): Promise<{
        id: string;
        roleId: string;
        permissionId: string;
    }[]>;
}
