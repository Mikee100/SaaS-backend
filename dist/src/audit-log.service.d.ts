import { PrismaService } from './prisma.service';
export declare class AuditLogService {
    private prisma;
    constructor(prisma: PrismaService);
    log(userId: string | null, action: string, details: any, ip?: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string | null;
        action: string;
        details: import("@prisma/client/runtime/library").JsonValue | null;
        ip: string | null;
    }>;
    getLogs(limit?: number): Promise<({
        user: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            tenantId: string | null;
            branchId: string | null;
            email: string;
            password: string;
            isSuperadmin: boolean;
            resetPasswordToken: string | null;
            resetPasswordExpires: Date | null;
            notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
            language: string | null;
            region: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        userId: string | null;
        action: string;
        details: import("@prisma/client/runtime/library").JsonValue | null;
        ip: string | null;
    })[]>;
}
