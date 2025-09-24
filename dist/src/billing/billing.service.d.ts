import { PrismaService } from '../prisma.service';
export interface SubscriptionDetails {
    id: string;
    plan: {
        name: string;
        price: number;
    };
}
export interface InvoiceWithSubscription {
    id: string;
    number: string;
    amount: number;
    status: string;
    dueDate: Date | null;
    paidAt: Date | null;
    createdAt: Date;
    subscription: SubscriptionDetails | null;
}
export declare class BillingService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getAllTenantSubscriptions(): Promise<{
        tenantId: string;
        clientName: string;
        clientEmail: string;
        plan: {
            name: string;
            price: number;
            interval: string;
            features: {
                maxUsers: number | null;
                maxProducts: number | null;
                maxSalesPerMonth: number | null;
                analyticsEnabled: boolean;
                advancedReports: boolean;
                prioritySupport: boolean;
                customBranding: boolean;
                apiAccess: boolean;
            };
        } | null;
        status: string;
        startDate: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        lastInvoice: {
            id: string;
            amount: number;
            status: string;
            dueDate: Date | null;
            paidAt: Date | null;
        } | null;
        lastPayment: {
            id: string;
            amount: number;
            currency: string;
            status: string;
            completedAt: Date | null;
        } | null;
    }[]>;
    getPlans(): Promise<{
        features: string[];
        PlanFeatureOnPlan: ({
            PlanFeature: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                isEnabled: boolean;
                featureKey: string;
                featureName: string;
                featureDescription: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            planId: string;
            stripePriceId: string | null;
            isEnabled: boolean;
            featureId: string;
        })[];
        id: string;
        name: string;
        description: string;
        backupRestore: boolean;
        customIntegrations: boolean;
        ssoEnabled: boolean;
        whiteLabel: boolean;
        price: number;
        customFields: boolean;
        stripePriceId: string | null;
        isActive: boolean;
        interval: string;
        maxUsers: number | null;
        maxProducts: number | null;
        maxSalesPerMonth: number | null;
        analyticsEnabled: boolean;
        advancedReports: boolean;
        prioritySupport: boolean;
        customBranding: boolean;
        apiAccess: boolean;
        advancedSecurity: boolean;
        auditLogs: boolean;
        bulkOperations: boolean;
        dataExport: boolean;
        dedicatedSupport: boolean;
    }[] | ({
        id: string;
        name: string;
        price: number;
        interval: string;
        maxUsers: number;
        maxProducts: number;
        maxSalesPerMonth: number;
        features: string[];
    } | {
        id: string;
        name: string;
        price: number;
        interval: string;
        maxUsers: null;
        maxProducts: null;
        maxSalesPerMonth: null;
        features: string[];
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
            description: string;
            backupRestore: boolean;
            customIntegrations: boolean;
            ssoEnabled: boolean;
            whiteLabel: boolean;
            price: number;
            customFields: boolean;
            stripePriceId: string | null;
            isActive: boolean;
            interval: string;
            maxUsers: number | null;
            maxProducts: number | null;
            maxSalesPerMonth: number | null;
            analyticsEnabled: boolean;
            advancedReports: boolean;
            prioritySupport: boolean;
            customBranding: boolean;
            apiAccess: boolean;
            advancedSecurity: boolean;
            auditLogs: boolean;
            bulkOperations: boolean;
            dataExport: boolean;
            dedicatedSupport: boolean;
        };
        Plan: {
            id: string;
            name: string;
            description: string;
            backupRestore: boolean;
            customIntegrations: boolean;
            ssoEnabled: boolean;
            whiteLabel: boolean;
            price: number;
            customFields: boolean;
            stripePriceId: string | null;
            isActive: boolean;
            interval: string;
            maxUsers: number | null;
            maxProducts: number | null;
            maxSalesPerMonth: number | null;
            analyticsEnabled: boolean;
            advancedReports: boolean;
            prioritySupport: boolean;
            customBranding: boolean;
            apiAccess: boolean;
            advancedSecurity: boolean;
            auditLogs: boolean;
            bulkOperations: boolean;
            dataExport: boolean;
            dedicatedSupport: boolean;
        };
        id: string;
        tenantId: string;
        userId: string;
        stripeCustomerId: string;
        status: string;
        planId: string;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        canceledAt: Date | null;
        stripePriceId: string;
        stripeSubscriptionId: string;
        stripeCurrentPeriodEnd: Date;
        trialEnd: Date | null;
        trialStart: Date | null;
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
    getInvoices(tenantId: string): Promise<InvoiceWithSubscription[]>;
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
