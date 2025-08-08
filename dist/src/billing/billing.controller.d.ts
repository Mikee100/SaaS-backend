import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { SubscriptionService } from './subscription.service';
import { RawBodyRequest } from '@nestjs/common';
export declare class BillingController {
    private readonly billingService;
    private readonly stripeService;
    private readonly subscriptionService;
    constructor(billingService: BillingService, stripeService: StripeService, subscriptionService: SubscriptionService);
    testEndpoint(): Promise<{
        message: string;
        plansCount: number;
        timestamp: string;
        error?: undefined;
    } | {
        error: any;
        timestamp: string;
        message?: undefined;
        plansCount?: undefined;
    }>;
    testSubscription(req: any): Promise<{
        error: string;
        user: any;
        timestamp: string;
        message?: undefined;
        tenantId?: undefined;
        subscription?: undefined;
    } | {
        message: string;
        tenantId: any;
        subscription: {
            plan: {
                name: string;
                price: number;
            };
            status: string;
            currentPeriodStart: null;
            currentPeriodEnd: null;
            cancelAtPeriodEnd: boolean;
            id?: undefined;
            canceledAt?: undefined;
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
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            cancelAtPeriodEnd: boolean;
            canceledAt: Date | null;
        };
        timestamp: string;
        error?: undefined;
        user?: undefined;
    } | {
        error: any;
        timestamp: string;
        user?: undefined;
        message?: undefined;
        tenantId?: undefined;
        subscription?: undefined;
    }>;
    healthCheck(): Promise<{
        status: string;
        service: string;
        timestamp: string;
    }>;
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
    getCurrentSubscription(req: any): Promise<{
        plan: {
            name: string;
            price: number;
        };
        status: string;
        currentPeriodStart: null;
        currentPeriodEnd: null;
        cancelAtPeriodEnd: boolean;
        id?: undefined;
        canceledAt?: undefined;
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
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        canceledAt: Date | null;
    }>;
    getCurrentSubscriptionWithPermissions(req: any): Promise<{
        plan: {
            name: string;
            price: number;
        };
        status: string;
        currentPeriodStart: null;
        currentPeriodEnd: null;
        cancelAtPeriodEnd: boolean;
        id?: undefined;
        canceledAt?: undefined;
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
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        canceledAt: Date | null;
    }>;
    getPlanLimits(req: any): Promise<{
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
    getInvoices(req: any): Promise<{
        id: string;
        description: string | null;
        currency: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        status: string;
        subscriptionId: string | null;
        amount: number;
        dueDate: Date;
        paidAt: Date | null;
        stripeInvoiceId: string | null;
    }[]>;
    createSubscription(body: {
        planId: string;
    }, req: any): Promise<{
        message: string;
        subscription: {
            subscription: {
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
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                planId: string;
                status: string;
                currentPeriodStart: Date;
                currentPeriodEnd: Date;
                cancelAtPeriodEnd: boolean;
                canceledAt: Date | null;
                stripeSubscriptionId: string | null;
                stripePriceId: string | null;
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
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            planId: string;
            status: string;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            cancelAtPeriodEnd: boolean;
            canceledAt: Date | null;
            stripeSubscriptionId: string | null;
            stripePriceId: string | null;
        });
    }>;
    createCheckoutSession(body: {
        priceId: string;
        successUrl: string;
        cancelUrl: string;
    }, req: any): Promise<{
        sessionId: string;
        url: string | null;
    }>;
    createPortalSession(body: {
        returnUrl: string;
    }, req: any): Promise<{
        url: string;
    }>;
    cancelSubscription(req: any): Promise<{
        message: string;
    }>;
    getSubscriptionDetails(req: any): Promise<import("stripe").Stripe.Subscription | null>;
    cleanupOrphanedSubscriptions(req: any): Promise<{
        message: string;
    }>;
    handleWebhook(req: RawBodyRequest<Request>): Promise<{
        received: boolean;
    }>;
}
