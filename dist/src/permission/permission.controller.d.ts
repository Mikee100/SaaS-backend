import { PermissionService } from './permission.service';
export declare class PermissionController {
    private readonly permissionService;
    constructor(permissionService: PermissionService);
    getPermissions(): Promise<{
        id: string;
        name: string;
        description: string | null;
    }[]>;
    createPermission(body: any): Promise<{
        id: string;
        name: string;
        description: string | null;
    }>;
}
