import { PrismaService } from '../prisma.service';
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
    getLogs(userId?: string, action?: string, limit?: number): Promise<{
        id: string;
        createdAt: Date;
        userId: string | null;
        action: string;
        details: import("@prisma/client/runtime/library").JsonValue | null;
        ip: string | null;
    }[]>;
}
