import { PermissionService } from './permission.service';
export declare class RoleController {
    private readonly permissionService;
    constructor(permissionService: PermissionService);
    getRoles(): Promise<{
        id: string;
        name: string;
        description: string | null;
    }[]>;
    createRole(body: any): Promise<{
        id: string;
        name: string;
        description: string | null;
    }>;
    getRolePermissions(id: string): Promise<({
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
    updateRolePermissions(id: string, body: any): Promise<({
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
