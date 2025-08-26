import { BillingService } from './billing.service';
import { SubscriptionService } from './subscription.service';
export declare class BillingController {
    private billingService;
    private subscriptionService;
    constructor(billingService: BillingService, subscriptionService: SubscriptionService);
    test(): Promise<{
        message: string;
    }>;
    getPlans(): Promise<{
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
        startDate: Date;
        endDate: Date;
        cancelledAt: any;
        currentPeriodStart?: undefined;
        currentPeriodEnd?: undefined;
    }>;
    getPlanLimits(req: any): Promise<{
        maxUsers: any;
        maxProducts: any;
        maxSalesPerMonth: any;
        analyticsEnabled: any;
        advancedReports: any;
        prioritySupport: any;
        customBranding: any;
        apiAccess: any;
    }>;
    createSubscription(req: any, data: {
        planId: string;
        paymentMethodId?: string;
    }): Promise<{
        id: string;
        stripePriceId: string;
        tenantId: string;
        userId: string;
        status: string;
        stripeCustomerId: string;
        stripeSubscriptionId: string;
        stripeCurrentPeriodEnd: Date;
        canceledAt: Date | null;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        trialStart: Date | null;
        trialEnd: Date | null;
        planId: string;
    }>;
    updateSubscription(req: any, data: {
        planId: string;
        effectiveDate?: Date;
    }): Promise<{
        subscription: {
            id: string;
            stripePriceId: string;
            tenantId: string;
            userId: string;
            status: string;
            stripeCustomerId: string;
            stripeSubscriptionId: string;
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
        stripePriceId: string;
        tenantId: string;
        userId: string;
        status: string;
        stripeCustomerId: string;
        stripeSubscriptionId: string;
        stripeCurrentPeriodEnd: Date;
        canceledAt: Date | null;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        trialStart: Date | null;
        trialEnd: Date | null;
        planId: string;
    }>;
    getSubscriptionHistory(req: any): Promise<{
        id: string;
        stripePriceId: string;
        tenantId: string;
        userId: string;
        status: string;
        stripeCustomerId: string;
        stripeSubscriptionId: string;
        stripeCurrentPeriodEnd: Date;
        canceledAt: Date | null;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        trialStart: Date | null;
        trialEnd: Date | null;
        planId: string;
    }[]>;
    getInvoices(req: any): Promise<{
        number: string;
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        amount: number;
        status: string;
        dueDate: Date | null;
        paidAt: Date | null;
        subscriptionId: string | null;
    }[]>;
    addPaymentMethod(req: any, data: any): Promise<{
        message: string;
    }>;
    getPaymentMethods(req: any): Promise<never[]>;
}
