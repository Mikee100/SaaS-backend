import { SubscriptionService } from './subscription.service';
export declare class SubscriptionController {
    private readonly subscriptionService;
    constructor(subscriptionService: SubscriptionService);
    createSubscription(body: {
        planId: string;
        paymentMethodId?: string;
    }, req: any): Promise<{
        id: string;
        stripeSubscriptionId: string;
        stripeCustomerId: string;
        stripePriceId: string;
        stripeCurrentPeriodEnd: Date;
        status: string;
        canceledAt: Date | null;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        trialStart: Date | null;
        trialEnd: Date | null;
        planId: string;
        tenantId: string;
        userId: string;
    } | {
        subscription: {
            plan: {
                id: string;
                stripePriceId: string | null;
                name: string;
                description: string;
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
                whiteLabel: boolean;
                dedicatedSupport: boolean;
                ssoEnabled: boolean;
                auditLogs: boolean;
                backupRestore: boolean;
                customIntegrations: boolean;
            };
        } & {
            id: string;
            stripeSubscriptionId: string;
            stripeCustomerId: string;
            stripePriceId: string;
            stripeCurrentPeriodEnd: Date;
            status: string;
            canceledAt: Date | null;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            cancelAtPeriodEnd: boolean;
            trialStart: Date | null;
            trialEnd: Date | null;
            planId: string;
            tenantId: string;
            userId: string;
        };
        proration: {
            credit: number;
            charge: number;
            netCharge: number;
        };
    }>;
    updateSubscription(body: {
        planId: string;
        effectiveDate?: Date;
    }, req: any): Promise<{
        subscription: {
            plan: {
                id: string;
                stripePriceId: string | null;
                name: string;
                description: string;
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
                whiteLabel: boolean;
                dedicatedSupport: boolean;
                ssoEnabled: boolean;
                auditLogs: boolean;
                backupRestore: boolean;
                customIntegrations: boolean;
            };
        } & {
            id: string;
            stripeSubscriptionId: string;
            stripeCustomerId: string;
            stripePriceId: string;
            stripeCurrentPeriodEnd: Date;
            status: string;
            canceledAt: Date | null;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            cancelAtPeriodEnd: boolean;
            trialStart: Date | null;
            trialEnd: Date | null;
            planId: string;
            tenantId: string;
            userId: string;
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
        stripeSubscriptionId: string;
        stripeCustomerId: string;
        stripePriceId: string;
        stripeCurrentPeriodEnd: Date;
        status: string;
        canceledAt: Date | null;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        trialStart: Date | null;
        trialEnd: Date | null;
        planId: string;
        tenantId: string;
        userId: string;
    }>;
    getSubscriptionHistory(req: any): Promise<({
        plan: {
            id: string;
            stripePriceId: string | null;
            name: string;
            description: string;
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
            whiteLabel: boolean;
            dedicatedSupport: boolean;
            ssoEnabled: boolean;
            auditLogs: boolean;
            backupRestore: boolean;
            customIntegrations: boolean;
        };
        invoices: {
            number: string;
            id: string;
            status: string;
            tenantId: string;
            createdAt: Date;
            amount: number;
            dueDate: Date | null;
            paidAt: Date | null;
            subscriptionId: string | null;
            updatedAt: Date;
        }[];
    } & {
        id: string;
        stripeSubscriptionId: string;
        stripeCustomerId: string;
        stripePriceId: string;
        stripeCurrentPeriodEnd: Date;
        status: string;
        canceledAt: Date | null;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        trialStart: Date | null;
        trialEnd: Date | null;
        planId: string;
        tenantId: string;
        userId: string;
    })[]>;
}
