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
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        role: string;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
    }>;
    findByEmail(email: string): Promise<{
        id: string;
        name: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        role: string;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
    } | null>;
    findAllByTenant(tenantId: string): Promise<{
        id: string;
        name: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        role: string;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
    }[]>;
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
                key: string;
                description: string | null;
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
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        role: string;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
    }) | null>;
    deleteUser(id: string, tenantId: string, actorUserId?: string, ip?: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    getUserPermissions(userId: string): Promise<({
        permission: {
            id: string;
            key: string;
            description: string | null;
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
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        role: string;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
    }>;
    updateUserPreferences(userId: string, data: {
        notificationPreferences?: any;
        language?: string;
        region?: string;
    }): Promise<{
        id: string;
        name: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        role: string;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        id: string;
        name: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        role: string;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
    }>;
}
