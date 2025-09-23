import { PrismaService } from '../prisma.service';
export declare class BillingService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getAllTenantSubscriptions(): Promise<{
        tenantId: string;
        clientName: string;
        clientEmail: string;
        plan: {
            name: any;
            price: any;
            interval: any;
            features: {
                maxUsers: any;
                maxProducts: any;
                maxSalesPerMonth: any;
                analyticsEnabled: any;
                advancedReports: any;
                prioritySupport: any;
                customBranding: any;
                apiAccess: any;
            };
        } | null;
        status: any;
        startDate: any;
        currentPeriodEnd: any;
        cancelAtPeriodEnd: any;
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
        features: any;
        id: string;
        name: string;
        description: string;
        isActive: boolean;
        price: number;
        stripePriceId: string | null;
        backupRestore: boolean;
        customIntegrations: boolean;
        ssoEnabled: boolean;
        whiteLabel: boolean;
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
        customFields: boolean;
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
        plan: any;
        id: string;
        tenantId: string;
        userId: string;
        status: string;
        planId: string;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        trialEnd: Date | null;
        canceledAt: Date | null;
        stripeCurrentPeriodEnd: Date;
        stripeCustomerId: string;
        stripePriceId: string;
        stripeSubscriptionId: string;
        trialStart: Date | null;
    }>;
    hasFeature(tenantId: string, feature: string): Promise<boolean>;
    getPlanLimits(tenantId: string): Promise<{
        maxUsers: any;
        maxProducts: any;
        maxSalesPerMonth: any;
        analyticsEnabled: any;
        advancedReports: any;
        prioritySupport: any;
        customBranding: any;
        apiAccess: any;
        bulkOperations: any;
        dataExport: any;
        customFields: any;
        advancedSecurity: any;
        whiteLabel: any;
        dedicatedSupport: any;
        ssoEnabled: any;
        auditLogs: any;
        backupRestore: any;
        customIntegrations: any;
    }>;
    checkLimit(tenantId: string, limitType: 'users' | 'products' | 'sales'): Promise<{
        allowed: boolean;
        current: number;
        limit: number;
    }>;
    getEnterpriseFeatures(tenantId: string): Promise<{
        customBranding: {
            enabled: any;
            features: string[];
        };
        apiAccess: {
            enabled: any;
            features: string[];
        };
        security: {
            enabled: any;
            features: string[];
        };
        support: {
            enabled: any;
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
                name: any;
                price: any;
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
        customBranding: any;
        apiAccess: any;
        advancedSecurity: any;
        dedicatedSupport: any;
    }>;
}
