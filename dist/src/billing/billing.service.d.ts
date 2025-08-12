import { PrismaService } from '../prisma.service';
export declare class BillingService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getPlans(): Promise<{
        id: string;
        name: string;
        auditLogs: boolean;
        description: string;
        whiteLabel: boolean;
        customIntegrations: boolean;
        ssoEnabled: boolean;
        backupRestore: boolean;
        price: number;
        interval: string;
        isActive: boolean;
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
        dedicatedSupport: boolean;
    }[] | ({
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
    } | {
        id: string;
        name: string;
        price: number;
        interval: string;
        maxUsers: null;
        maxProducts: null;
        maxSalesPerMonth: null;
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
    })[]>;
    getCurrentSubscription(tenantId: string): Promise<{
        plan: {
            name: string;
            price: number;
            id: string;
        };
        status: string;
        currentPeriodStart: null;
        currentPeriodEnd: null;
        cancelAtPeriodEnd: boolean;
    } | {
        plan: {
            id: string;
            name: string;
            auditLogs: boolean;
            description: string;
            whiteLabel: boolean;
            customIntegrations: boolean;
            ssoEnabled: boolean;
            backupRestore: boolean;
            price: number;
            interval: string;
            isActive: boolean;
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
            dedicatedSupport: boolean;
        };
        id: string;
        tenantId: string;
        userId: string;
        status: string;
        stripeSubscriptionId: string;
        stripeCustomerId: string;
        stripePriceId: string;
        stripeCurrentPeriodEnd: Date;
        canceledAt: Date | null;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        trialStart: Date | null;
        trialEnd: Date | null;
        planId: string;
    }>;
    hasFeature(tenantId: string, feature: string): Promise<boolean>;
    getPlanLimits(tenantId: string): Promise<{
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
    }>;
    checkLimit(tenantId: string, limitType: 'users' | 'products' | 'sales'): Promise<{
        allowed: boolean;
        current: number;
        limit: number;
    }>;
    getEnterpriseFeatures(tenantId: string): Promise<{
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
    getInvoices(tenantId: string): Promise<{
        id: string;
        number: string;
        amount: number;
        status: string;
        dueDate: Date | null;
        paidAt: Date | null;
        createdAt: Date;
        subscription: {
            id: string;
            plan: {
                name: string;
                price: number;
            } | null;
        } | null;
    }[]>;
    getPlanFeatures(planId: string): Promise<{
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
    }>;
    getSubscriptionFeatures(subscriptionId: string): Promise<{
        customBranding: boolean;
        apiAccess: boolean;
        advancedSecurity: boolean;
        dedicatedSupport: boolean;
    }>;
}
