import { PermissionService } from './permission.service';
export declare class RoleController {
    private readonly permissionService;
    constructor(permissionService: PermissionService);
    getRoles(): Promise<{
        id: string;
        name: string;
        description: string | null;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    createRole(body: any): Promise<{
        id: string;
        name: string;
        description: string | null;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getRolePermissions(id: string): Promise<({
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
