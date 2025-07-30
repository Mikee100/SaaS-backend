import { BillingService } from './billing.service';
export declare class BillingController {
    private readonly billingService;
    constructor(billingService: BillingService);
    getPlans(): Promise<{
        id: string;
        name: string;
        description: string | null;
        price: number;
        currency: string;
        interval: string;
        features: import("@prisma/client/runtime/library").JsonValue | null;
        maxUsers: number | null;
        maxProducts: number | null;
        maxSalesPerMonth: number | null;
        analyticsEnabled: boolean;
        advancedReports: boolean;
        prioritySupport: boolean;
        customBranding: boolean;
        apiAccess: boolean;
        bulkOperations: boolean;
        dataExport: boolean;
        customFields: boolean;
        advancedSecurity: boolean;
        whiteLabel: boolean;
        dedicatedSupport: boolean;
        ssoEnabled: boolean;
        auditLogs: boolean;
        backupRestore: boolean;
        customIntegrations: boolean;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[] | {
        id: string;
        name: string;
        price: number;
        interval: string;
        maxUsers: number;
        maxProducts: number;
        maxSalesPerMonth: number;
        analyticsEnabled: boolean;
        advancedReports: boolean;
        prioritySupport: boolean;
        customBranding: boolean;
        apiAccess: boolean;
        bulkOperations: boolean;
        dataExport: boolean;
        customFields: boolean;
        advancedSecurity: boolean;
        whiteLabel: boolean;
        dedicatedSupport: boolean;
        ssoEnabled: boolean;
        auditLogs: boolean;
        backupRestore: boolean;
        customIntegrations: boolean;
    }[]>;
    getCurrentSubscription(req: any): Promise<{
        plan: {
            name: string;
            price: number;
        };
        status: string;
        currentPeriodStart: null;
        currentPeriodEnd: null;
        id?: undefined;
        startDate?: undefined;
        endDate?: undefined;
        cancelledAt?: undefined;
    } | {
        id: string;
        status: string;
        plan: {
            id: string;
            name: string;
            description: string | null;
            price: number;
            currency: string;
            interval: string;
            features: import("@prisma/client/runtime/library").JsonValue | null;
            maxUsers: number | null;
            maxProducts: number | null;
            maxSalesPerMonth: number | null;
            analyticsEnabled: boolean;
            advancedReports: boolean;
            prioritySupport: boolean;
            customBranding: boolean;
            apiAccess: boolean;
            bulkOperations: boolean;
            dataExport: boolean;
            customFields: boolean;
            advancedSecurity: boolean;
            whiteLabel: boolean;
            dedicatedSupport: boolean;
            ssoEnabled: boolean;
            auditLogs: boolean;
            backupRestore: boolean;
            customIntegrations: boolean;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
        startDate: Date;
        endDate: Date;
        cancelledAt: Date | null;
        currentPeriodStart?: undefined;
        currentPeriodEnd?: undefined;
    }>;
    getPlanLimits(req: any): Promise<{
        currentPlan: string;
        limits: {
            maxUsers: number | null;
            maxProducts: number | null;
            maxSalesPerMonth: number | null;
            analyticsEnabled: boolean;
            advancedReports: boolean;
            prioritySupport: boolean;
            customBranding: boolean;
            apiAccess: boolean;
            bulkOperations: boolean;
            dataExport: boolean;
            customFields: boolean;
            advancedSecurity: boolean;
            whiteLabel: boolean;
            dedicatedSupport: boolean;
            ssoEnabled: boolean;
            auditLogs: boolean;
            backupRestore: boolean;
            customIntegrations: boolean;
        };
        features: {
            analytics: boolean;
            advanced_reports: boolean;
            priority_support: boolean;
            custom_branding: boolean;
            api_access: boolean;
            bulk_operations: boolean;
            data_export: boolean;
            custom_fields: boolean;
            advanced_security: boolean;
            white_label: boolean;
            dedicated_support: boolean;
            sso_enabled: boolean;
            audit_logs: boolean;
            backup_restore: boolean;
            custom_integrations: boolean;
        };
    }>;
    getEnterpriseFeatures(req: any): Promise<{
        customBranding: {
            enabled: boolean;
            features: string[];
        };
        apiAccess: {
            enabled: boolean;
            features: string[];
        };
        security: {
            enabled: boolean;
            features: string[];
        };
        support: {
            enabled: boolean;
            features: string[];
        };
    } | null>;
    createSubscription(req: any, body: {
        planId: string;
    }): Promise<{
        success: boolean;
        message: string;
        planId: string;
    }>;
    updateSubscription(req: any, body: {
        planId: string;
    }): Promise<{
        success: boolean;
        message: string;
        planId: string;
    }>;
    cancelSubscription(req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    getInvoices(req: any): Promise<{
        id: string;
        description: string | null;
        currency: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        subscriptionId: string;
        amount: number;
        dueDate: Date;
        paidAt: Date | null;
        invoiceNumber: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
}
