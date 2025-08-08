import { AuditLogService } from '../audit-log.service';
export declare class BillingLoggerService {
    private readonly auditLogService;
    private readonly logger;
    constructor(auditLogService: AuditLogService);
    logBillingEvent(userId: string, event: string, data: Record<string, any>, level?: 'info' | 'warn' | 'error'): Promise<void>;
    logSubscriptionEvent(userId: string, event: string, subscriptionId: string, tenantId: string, additionalData?: Record<string, any>): Promise<void>;
    logPaymentEvent(userId: string, event: string, amount: number, currency: string, additionalData?: Record<string, any>): Promise<void>;
    logWebhookEvent(eventType: string, eventId: string, tenantId?: string, additionalData?: Record<string, any>): Promise<void>;
    logSecurityEvent(userId: string, event: string, ipAddress: string, userAgent: string, additionalData?: Record<string, any>): Promise<void>;
    logPlanChange(userId: string, oldPlan: string, newPlan: string, tenantId: string, additionalData?: Record<string, any>): Promise<void>;
    logBillingError(userId: string, error: Error, context?: Record<string, any>): Promise<void>;
}
