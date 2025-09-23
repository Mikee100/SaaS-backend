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
                auditLogs: boolean;
                description: string;
                price: number;
                customFields: boolean;
                whiteLabel: boolean;
                customIntegrations: boolean;
                ssoEnabled: boolean;
                backupRestore: boolean;
                stripePriceId: string | null;
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
                advancedSecurity: boolean;
                dedicatedSupport: boolean;
            };
        } & {
            id: string;
            userId: string;
            tenantId: string;
            status: string;
            stripeCustomerId: string;
            stripeSubscriptionId: string;
            stripePriceId: string;
            stripeCurrentPeriodEnd: Date;
            canceledAt: Date | null;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            cancelAtPeriodEnd: boolean;
            trialStart: Date | null;
            trialEnd: Date | null;
            planId: string;
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
            auditLogs: boolean;
            description: string;
            price: number;
            customFields: boolean;
            whiteLabel: boolean;
            customIntegrations: boolean;
            ssoEnabled: boolean;
            backupRestore: boolean;
            stripePriceId: string | null;
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
            advancedSecurity: boolean;
            dedicatedSupport: boolean;
        };
    } & {
        id: string;
        userId: string;
        tenantId: string;
        status: string;
        stripeCustomerId: string;
        stripeSubscriptionId: string;
        stripePriceId: string;
        stripeCurrentPeriodEnd: Date;
        canceledAt: Date | null;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        trialStart: Date | null;
        trialEnd: Date | null;
        planId: string;
    })>;
    updateSubscription(body: {
        planId: string;
        effectiveDate?: Date;
    }, req: any): Promise<{
        subscription: {
            plan: {
                id: string;
                name: string;
                auditLogs: boolean;
                description: string;
                price: number;
                customFields: boolean;
                whiteLabel: boolean;
                customIntegrations: boolean;
                ssoEnabled: boolean;
                backupRestore: boolean;
                stripePriceId: string | null;
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
                advancedSecurity: boolean;
                dedicatedSupport: boolean;
            };
        } & {
            id: string;
            userId: string;
            tenantId: string;
            status: string;
            stripeCustomerId: string;
            stripeSubscriptionId: string;
            stripePriceId: string;
            stripeCurrentPeriodEnd: Date;
            canceledAt: Date | null;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            cancelAtPeriodEnd: boolean;
            trialStart: Date | null;
            trialEnd: Date | null;
            planId: string;
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
        userId: string;
        tenantId: string;
        status: string;
        stripeCustomerId: string;
        stripeSubscriptionId: string;
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
    getSubscriptionHistory(req: any): Promise<({
        plan: {
            id: string;
            name: string;
            auditLogs: boolean;
            description: string;
            price: number;
            customFields: boolean;
            whiteLabel: boolean;
            customIntegrations: boolean;
            ssoEnabled: boolean;
            backupRestore: boolean;
            stripePriceId: string | null;
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
            advancedSecurity: boolean;
            dedicatedSupport: boolean;
        };
        invoices: {
            number: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            amount: number;
            status: string;
            dueDate: Date | null;
            paidAt: Date | null;
            subscriptionId: string | null;
        }[];
    } & {
        id: string;
        userId: string;
        tenantId: string;
        status: string;
        stripeCustomerId: string;
        stripeSubscriptionId: string;
        stripePriceId: string;
        stripeCurrentPeriodEnd: Date;
        canceledAt: Date | null;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        trialStart: Date | null;
        trialEnd: Date | null;
        planId: string;
    })[]>;
}
