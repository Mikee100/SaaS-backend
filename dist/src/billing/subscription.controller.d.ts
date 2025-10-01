import { SubscriptionService } from './subscription.service';
export declare class SubscriptionController {
    private readonly subscriptionService;
    constructor(subscriptionService: SubscriptionService);
    createSubscription(body: {
        planId: string;
        paymentMethodId?: string;
    }, req: any): Promise<{
        subscription: {
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
                interval: string;
                maxUsers: number | null;
                maxProducts: number | null;
                maxSalesPerMonth: number | null;
                analyticsEnabled: boolean;
                advancedReports: boolean;
                prioritySupport: boolean;
                customBranding: boolean;
                apiAccess: boolean;
                isActive: boolean;
                advancedSecurity: boolean;
                auditLogs: boolean;
                bulkOperations: boolean;
                dataExport: boolean;
                dedicatedSupport: boolean;
            };
        } & {
            id: string;
            tenantId: string;
            userId: string;
            stripeCustomerId: string;
            status: string;
            stripeSubscriptionId: string;
            planId: string;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            cancelAtPeriodEnd: boolean;
            canceledAt: Date | null;
            stripePriceId: string;
            stripeCurrentPeriodEnd: Date;
            trialEnd: Date | null;
            trialStart: Date | null;
        };
        proration: {
            credit: number;
            charge: number;
            netCharge: number;
        };
    } | ({
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
            interval: string;
            maxUsers: number | null;
            maxProducts: number | null;
            maxSalesPerMonth: number | null;
            analyticsEnabled: boolean;
            advancedReports: boolean;
            prioritySupport: boolean;
            customBranding: boolean;
            apiAccess: boolean;
            isActive: boolean;
            advancedSecurity: boolean;
            auditLogs: boolean;
            bulkOperations: boolean;
            dataExport: boolean;
            dedicatedSupport: boolean;
        };
    } & {
        id: string;
        tenantId: string;
        userId: string;
        stripeCustomerId: string;
        status: string;
        stripeSubscriptionId: string;
        planId: string;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        canceledAt: Date | null;
        stripePriceId: string;
        stripeCurrentPeriodEnd: Date;
        trialEnd: Date | null;
        trialStart: Date | null;
    })>;
    updateSubscription(body: {
        planId: string;
        effectiveDate?: Date;
    }, req: any): Promise<{
        subscription: {
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
                interval: string;
                maxUsers: number | null;
                maxProducts: number | null;
                maxSalesPerMonth: number | null;
                analyticsEnabled: boolean;
                advancedReports: boolean;
                prioritySupport: boolean;
                customBranding: boolean;
                apiAccess: boolean;
                isActive: boolean;
                advancedSecurity: boolean;
                auditLogs: boolean;
                bulkOperations: boolean;
                dataExport: boolean;
                dedicatedSupport: boolean;
            };
        } & {
            id: string;
            tenantId: string;
            userId: string;
            stripeCustomerId: string;
            status: string;
            stripeSubscriptionId: string;
            planId: string;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            cancelAtPeriodEnd: boolean;
            canceledAt: Date | null;
            stripePriceId: string;
            stripeCurrentPeriodEnd: Date;
            trialEnd: Date | null;
            trialStart: Date | null;
        };
        proration: {
            credit: number;
            charge: number;
            netCharge: number;
        };
    } | {
        message: string;
        effectiveDate: any;
        currentPlan: any;
        newPlan: any;
    }>;
    cancelSubscription(req: any): Promise<{
        id: string;
        tenantId: string;
        userId: string;
        stripeCustomerId: string;
        status: string;
        stripeSubscriptionId: string;
        planId: string;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        canceledAt: Date | null;
        stripePriceId: string;
        stripeCurrentPeriodEnd: Date;
        trialEnd: Date | null;
        trialStart: Date | null;
    }>;
    getSubscriptionHistory(req: any): Promise<({
        Invoice: {
            number: string;
            id: string;
            createdAt: Date;
            tenantId: string;
            updatedAt: Date;
            status: string;
            amount: number;
            dueDate: Date | null;
            paidAt: Date | null;
            subscriptionId: string | null;
        }[];
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
            interval: string;
            maxUsers: number | null;
            maxProducts: number | null;
            maxSalesPerMonth: number | null;
            analyticsEnabled: boolean;
            advancedReports: boolean;
            prioritySupport: boolean;
            customBranding: boolean;
            apiAccess: boolean;
            isActive: boolean;
            advancedSecurity: boolean;
            auditLogs: boolean;
            bulkOperations: boolean;
            dataExport: boolean;
            dedicatedSupport: boolean;
        };
    } & {
        id: string;
        tenantId: string;
        userId: string;
        stripeCustomerId: string;
        status: string;
        stripeSubscriptionId: string;
        planId: string;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        canceledAt: Date | null;
        stripePriceId: string;
        stripeCurrentPeriodEnd: Date;
        trialEnd: Date | null;
        trialStart: Date | null;
    })[]>;
}
