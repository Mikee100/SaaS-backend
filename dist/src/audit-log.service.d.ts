import { PrismaService } from './prisma.service';
export declare class AuditLogService {
    private prisma;
    constructor(prisma: PrismaService);
    log(userId: string | null, action: string, details: any, ip?: string, prismaClient?: any): Promise<any>;
    getLogs(limit?: number): Promise<({
        User: {
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
        } | null;
    } & {
        id: string;
        userId: string | null;
        createdAt: Date;
        action: string;
        details: import("@prisma/client/runtime/library").JsonValue | null;
        ip: string | null;
    })[]>;
}
