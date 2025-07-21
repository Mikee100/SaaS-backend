import { AuditLogService } from './audit-log.service';
export declare class AuditLogController {
    private readonly auditLogService;
    constructor(auditLogService: AuditLogService);
    getLogs(limit: string): Promise<({
        user: {
            id: string;
            createdAt: Date;
            name: string;
            email: string;
            password: string;
            updatedAt: Date;
            resetPasswordToken: string | null;
            resetPasswordExpires: Date | null;
            notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
            language: string | null;
            region: string | null;
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
