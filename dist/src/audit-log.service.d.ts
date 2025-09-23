import { PrismaService } from './prisma.service';
export declare class AuditLogService {
    private prisma;
    constructor(prisma: PrismaService);
    log(userId: string | null, action: string, details: any, ip?: string, prismaClient?: any): Promise<any>;
    getLogs(limit?: number): Promise<({
        user: {
            id: string;
            createdAt: Date;
            name: string;
            email: string;
            password: string;
            isSuperadmin: boolean;
            resetPasswordToken: string | null;
            resetPasswordExpires: Date | null;
            notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
            language: string | null;
            region: string | null;
            updatedAt: Date;
            tenantId: string | null;
            branchId: string | null;
        } | null;
    } & {
        id: string;
        userId: string | null;
        action: string;
        details: import("@prisma/client/runtime/library").JsonValue | null;
        ip: string | null;
        createdAt: Date;
    })[]>;
}
