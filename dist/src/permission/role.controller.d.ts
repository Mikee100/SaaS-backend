import { PermissionService } from './permission.service';
export declare class RoleController {
    private readonly permissionService;
    constructor(permissionService: PermissionService);
    createRole(body: any): Promise<void>;
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
        name: string;
        description: string | null;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    updateRole(body: any): Promise<void>;
    getRolePermissions(id: string): Promise<({
        role: {
            id: string;
            name: string;
            description: string | null;
            tenantId: string | null;
            createdAt: Date;
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
            tenantId: string | null;
            createdAt: Date;
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
