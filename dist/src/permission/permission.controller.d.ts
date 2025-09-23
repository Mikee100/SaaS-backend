import { PermissionService } from './permission.service';
export declare class PermissionController {
    private readonly permissionService;
    private readonly logger;
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
