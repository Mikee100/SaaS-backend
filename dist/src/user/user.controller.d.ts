import { UserService } from './user.service';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    createUser(body: any, req: any): Promise<{
        id: string;
        name: string;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
        branchId: string | null;
        password: string;
        email: string;
        isSuperadmin: boolean;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
    }>;
    getUsers(tenantId: string): Promise<({
        userRoles: ({
            role: {
                id: string;
                name: string;
                description: string | null;
                tenantId: string | null;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            id: string;
            tenantId: string;
            roleId: string;
            userId: string;
        })[];
    } & {
        id: string;
        name: string;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
        branchId: string | null;
        password: string;
        email: string;
        isSuperadmin: boolean;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
    })[]>;
    getProtected(req: any): {
        message: string;
        user: any;
    };
    getMe(req: any): Promise<{
        permissions: {
            key: any;
        }[];
        id: string;
        name: string;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
        branchId: string | null;
        password: string;
        email: string;
        isSuperadmin: boolean;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
    }>;
    updateUser(req: any, id: string, body: {
        name?: string;
        role?: string;
    }): Promise<import(".prisma/client").Prisma.BatchPayload>;
    updatePermissions(id: string, body: {
        permissions: {
            key: string;
            note?: string;
        }[];
    }, req: any): Promise<{
        id: string;
        name: string;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
        branchId: string | null;
        password: string;
        email: string;
        isSuperadmin: boolean;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
    } | null>;
    getUserPermissions(id: string, req: any): Promise<{
        id: string;
        tenantId: string;
        permission: string;
        userId: string;
        grantedBy: string | null;
        grantedAt: Date;
    }[]>;
    updatePreferences(req: any, body: {
        notificationPreferences?: any;
        language?: string;
        region?: string;
    }): Promise<{
        id: string;
        name: string;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
        branchId: string | null;
        password: string;
        email: string;
        isSuperadmin: boolean;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
    }>;
    deleteUser(req: any, id: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
