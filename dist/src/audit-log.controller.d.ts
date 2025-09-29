import { AuditLogService } from './audit-log.service';
export declare class AuditLogController {
    private readonly auditLogService;
    constructor(auditLogService: AuditLogService);
    getLogs(limit: string): Promise<({
        User: {
            id: string;
            name: string;
            tenantId: string | null;
            createdAt: Date;
            updatedAt: Date;
            branchId: string | null;
            email: string;
            password: string;
            resetPasswordExpires: Date | null;
            resetPasswordToken: string | null;
            language: string | null;
            notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
            region: string | null;
            isSuperadmin: boolean;
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
