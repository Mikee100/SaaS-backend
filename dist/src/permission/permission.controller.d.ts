import { PermissionService } from './permission.service';
export declare class PermissionController {
    private readonly permissionService;
    constructor(permissionService: PermissionService);
    getPermissions(): Promise<{
        id: string;
        key: string;
        description: string | null;
    }[]>;
    createPermission(body: any): Promise<{
        id: string;
        key: string;
        description: string | null;
    }>;
}
