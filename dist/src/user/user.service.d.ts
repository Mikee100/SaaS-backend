import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';
export declare class UserService {
    private prisma;
    private auditLogService;
    constructor(prisma: PrismaService, auditLogService: AuditLogService);
    createUser(data: {
        email: string;
        password: string;
        name: string;
        role: string;
        tenantId: string;
    }, actorUserId?: string, ip?: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
        isSuperadmin: boolean;
    }>;
    findByEmail(email: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
        isSuperadmin: boolean;
    } | null>;
    getUserRoles(userId: string): Promise<({
        role: {
            id: string;
            name: string;
            description: string | null;
        };
    } & {
        id: string;
        tenantId: string;
        userId: string;
        roleId: string;
    })[]>;
    findAllByTenant(tenantId: string): Promise<({
        userRoles: ({
            role: {
                id: string;
                name: string;
                description: string | null;
            };
        } & {
            id: string;
            tenantId: string;
            userId: string;
            roleId: string;
        })[];
        permissions: ({
            permission: {
                id: string;
                description: string | null;
                key: string;
            };
        } & {
            id: string;
            userId: string;
            permissionId: string;
            grantedBy: string | null;
            grantedAt: Date | null;
            note: string | null;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
        isSuperadmin: boolean;
    })[]>;
    updateUser(id: string, data: {
        name?: string;
        role?: string;
    }, tenantId: string, actorUserId?: string, ip?: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    updateUserPermissions(userId: string, permissions: Array<{
        key: string;
        note?: string;
    }>, grantedBy?: string, ip?: string): Promise<({
        permissions: ({
            permission: {
                id: string;
                description: string | null;
                key: string;
            };
        } & {
            id: string;
            userId: string;
            permissionId: string;
            grantedBy: string | null;
            grantedAt: Date | null;
            note: string | null;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
        isSuperadmin: boolean;
    }) | null>;
    updateUserPermissionsByTenant(userId: string, permissions: Array<{
        key: string;
        note?: string;
    }>, tenantId: string, grantedBy?: string, ip?: string): Promise<({
        permissions: ({
            permission: {
                id: string;
                description: string | null;
                key: string;
            };
        } & {
            id: string;
            userId: string;
            permissionId: string;
            grantedBy: string | null;
            grantedAt: Date | null;
            note: string | null;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
        isSuperadmin: boolean;
    }) | null>;
    deleteUser(id: string, tenantId: string, actorUserId?: string, ip?: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    getUserPermissions(userId: string): Promise<({
        permission: {
            id: string;
            description: string | null;
            key: string;
        };
    } & {
        id: string;
        userId: string;
        permissionId: string;
        grantedBy: string | null;
        grantedAt: Date | null;
        note: string | null;
    })[]>;
    getUserPermissionsByTenant(userId: string, tenantId: string): Promise<({
        permission: {
            id: string;
            description: string | null;
            key: string;
        };
    } & {
        id: string;
        userId: string;
        permissionId: string;
        grantedBy: string | null;
        grantedAt: Date | null;
        note: string | null;
    })[]>;
    updateUserByEmail(email: string, data: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
        isSuperadmin: boolean;
    }>;
    updateUserPreferences(userId: string, data: {
        notificationPreferences?: any;
        language?: string;
        region?: string;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
        isSuperadmin: boolean;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
        isSuperadmin: boolean;
    }>;
    getEffectivePermissions(userId: string, tenantId: string): Promise<string[]>;
}
