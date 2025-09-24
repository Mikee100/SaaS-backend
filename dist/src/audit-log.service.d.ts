import { PrismaService } from './prisma.service';
export declare class AuditLogService {
    private prisma;
    constructor(prisma: PrismaService);
    log(userId: string | null, action: string, details: any, ip?: string, prismaClient?: any): Promise<any>;
    getLogs(limit?: number): Promise<({
        User: {
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
