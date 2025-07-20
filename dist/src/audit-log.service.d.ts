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
