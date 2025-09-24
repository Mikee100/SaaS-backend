import { UserService } from './user.service';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    getMe(req: any): Promise<{
        id: any;
        email: any;
        name: any;
        roles: any;
        permissions: string[];
        tenantId: any;
        branchId: any;
        isSuperadmin: any;
    }>;
    updateUserPermissions(req: any, id: string, body: {
        permissions: string[];
    }): Promise<{
        success: boolean;
    }>;
    createUser(body: any, req: any): Promise<any>;
    getUsers(req: any, branchId?: string): Promise<{
        permissions: string[];
        userRoles: ({
            role: {
                id: string;
                name: string;
                description: string | null;
                createdAt: Date;
                tenantId: string | null;
                updatedAt: Date;
            };
        } & {
            id: string;
            tenantId: string;
            roleId: string;
            userId: string;
        })[];
        id: string;
        name: string;
        createdAt: Date;
        tenantId: string | null;
        updatedAt: Date;
        email: string;
        password: string;
        resetPasswordExpires: Date | null;
        resetPasswordToken: string | null;
        language: string | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        region: string | null;
        isSuperadmin: boolean;
        branchId: string | null;
    }[]>;
    getProtected(req: any): {
        message: string;
        user: any;
    };
    updateUser(req: any, id: string, body: {
        name?: string;
        role?: string;
    }): Promise<any>;
    updatePreferences(req: any, body: {
        notificationPreferences?: any;
        language?: string;
        region?: string;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        tenantId: string | null;
        updatedAt: Date;
        email: string;
        password: string;
        resetPasswordExpires: Date | null;
        resetPasswordToken: string | null;
        language: string | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        region: string | null;
        isSuperadmin: boolean;
        branchId: string | null;
    }>;
    deleteUser(req: any, id: string): Promise<any>;
}
