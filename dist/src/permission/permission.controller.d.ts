import { PermissionService } from './permission.service';
export declare class PermissionController {
    private readonly permissionService;
    constructor(permissionService: PermissionService);
    getPermissions(): Promise<{
        id: string;
        description: string | null;
        key: string;
    }[]>;
    createPermission(body: any): Promise<{
        id: string;
        description: string | null;
        key: string;
    }>;
}
