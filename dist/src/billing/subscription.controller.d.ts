import { SubscriptionService } from './subscription.service';
export declare class SubscriptionController {
    private readonly subscriptionService;
    constructor(subscriptionService: SubscriptionService);
    createSubscription(body: {
        planId: string;
        paymentMethodId?: string;
    }, req: any): Promise<{
        subscription: {
            plan: {
                id: string;
                name: string;
                whiteLabel: boolean;
                customIntegrations: boolean;
                ssoEnabled: boolean;
                backupRestore: boolean;
                stripePriceId: string | null;
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
                dedicatedSupport: boolean;
                auditLogs: boolean;
            };
        } & {
            id: string;
            stripeCustomerId: string;
            currentPeriodStart: Date;
            tenantId: string;
            currentPeriodEnd: Date;
            stripeSubscriptionId: string;
            stripePriceId: string;
            stripeCurrentPeriodEnd: Date;
            status: string;
            canceledAt: Date | null;
            cancelAtPeriodEnd: boolean;
            trialStart: Date | null;
            trialEnd: Date | null;
            planId: string;
            userId: string;
        };
        proration: {
            credit: number;
            charge: number;
            netCharge: number;
        };
    } | ({
        plan: {
            id: string;
            name: string;
            whiteLabel: boolean;
            customIntegrations: boolean;
            ssoEnabled: boolean;
            backupRestore: boolean;
            stripePriceId: string | null;
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
            dedicatedSupport: boolean;
            auditLogs: boolean;
        };
    } & {
        id: string;
        stripeCustomerId: string;
        currentPeriodStart: Date;
        tenantId: string;
        currentPeriodEnd: Date;
        stripeSubscriptionId: string;
        stripePriceId: string;
        stripeCurrentPeriodEnd: Date;
        status: string;
        canceledAt: Date | null;
        cancelAtPeriodEnd: boolean;
        trialStart: Date | null;
        trialEnd: Date | null;
        planId: string;
        userId: string;
    })>;
    updateSubscription(body: {
        planId: string;
        effectiveDate?: Date;
    }, req: any): Promise<{
        subscription: {
            plan: {
                id: string;
                name: string;
                whiteLabel: boolean;
                customIntegrations: boolean;
                ssoEnabled: boolean;
                backupRestore: boolean;
                stripePriceId: string | null;
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
                dedicatedSupport: boolean;
                auditLogs: boolean;
            };
        } & {
            id: string;
            stripeCustomerId: string;
            currentPeriodStart: Date;
            tenantId: string;
            currentPeriodEnd: Date;
            stripeSubscriptionId: string;
            stripePriceId: string;
            stripeCurrentPeriodEnd: Date;
            status: string;
            canceledAt: Date | null;
            cancelAtPeriodEnd: boolean;
            trialStart: Date | null;
            trialEnd: Date | null;
            planId: string;
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
        stripeCustomerId: string;
        currentPeriodStart: Date;
        tenantId: string;
        currentPeriodEnd: Date;
        stripeSubscriptionId: string;
        stripePriceId: string;
        stripeCurrentPeriodEnd: Date;
        status: string;
        canceledAt: Date | null;
        cancelAtPeriodEnd: boolean;
        trialStart: Date | null;
        trialEnd: Date | null;
        planId: string;
        userId: string;
    }>;
    getSubscriptionHistory(req: any): Promise<({
        invoices: {
            number: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            status: string;
            amount: number;
            dueDate: Date | null;
            paidAt: Date | null;
            subscriptionId: string | null;
        }[];
        plan: {
            id: string;
            name: string;
            whiteLabel: boolean;
            customIntegrations: boolean;
            ssoEnabled: boolean;
            backupRestore: boolean;
            stripePriceId: string | null;
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
            dedicatedSupport: boolean;
            auditLogs: boolean;
        };
    } & {
        id: string;
        stripeCustomerId: string;
        currentPeriodStart: Date;
        tenantId: string;
        currentPeriodEnd: Date;
        stripeSubscriptionId: string;
        stripePriceId: string;
        stripeCurrentPeriodEnd: Date;
        status: string;
        canceledAt: Date | null;
        cancelAtPeriodEnd: boolean;
        trialStart: Date | null;
        trialEnd: Date | null;
        planId: string;
        userId: string;
    })[]>;
}
