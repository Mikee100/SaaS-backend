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
                tenantId: string | null;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
            };
        } & {
            id: string;
            tenantId: string;
            userId: string;
            roleId: string;
        })[];
        id: string;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        branchId: string | null;
        email: string;
        password: string;
        resetPasswordExpires: Date | null;
        resetPasswordToken: string | null;
        language: string | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        region: string | null;
        isSuperadmin: boolean;
        isDisabled: boolean;
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
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        branchId: string | null;
        email: string;
        password: string;
        resetPasswordExpires: Date | null;
        resetPasswordToken: string | null;
        language: string | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        region: string | null;
        isSuperadmin: boolean;
        isDisabled: boolean;
    }>;
    changePassword(req: any, body: {
        currentPassword: string;
        newPassword: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    deleteUser(req: any, id: string): Promise<any>;
    getPlanLimits(req: any): Promise<{
        currentPlan: string | null;
        usage: {
            users: {
                current: number;
                limit: number;
            };
            products: {
                current: number;
                limit: number;
            };
            branches: {
                current: number;
                limit: number;
            };
            sales: {
                current: number;
                limit: number;
            };
        };
        features: {
            analytics: boolean;
            advanced_reports: boolean;
            custom_branding: boolean;
            api_access: boolean;
            bulk_operations: boolean;
            data_export: boolean;
            custom_fields: boolean;
        };
    }>;
}
