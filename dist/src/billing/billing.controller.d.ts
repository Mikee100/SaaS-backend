import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { SubscriptionService } from './subscription.service';
import { RawBodyRequest } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
export declare class BillingController {
    private readonly billingService;
    private readonly stripeService;
    private readonly subscriptionService;
    private readonly prisma;
    private readonly logger;
    constructor(billingService: BillingService, stripeService: StripeService, subscriptionService: SubscriptionService, prisma: PrismaService);
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
                whiteLabel: boolean;
                customIntegrations: boolean;
                ssoEnabled: boolean;
                backupRestore: boolean;
                description: string;
                price: number;
                customFields: boolean;
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
        auditLogs: boolean;
        whiteLabel: boolean;
        customIntegrations: boolean;
        ssoEnabled: boolean;
        backupRestore: boolean;
        description: string;
        price: number;
        customFields: boolean;
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
            whiteLabel: boolean;
            customIntegrations: boolean;
            ssoEnabled: boolean;
            backupRestore: boolean;
            description: string;
            price: number;
            customFields: boolean;
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
    getCurrentSubscriptionWithPermissions(req: any): Promise<{
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
            whiteLabel: boolean;
            customIntegrations: boolean;
            ssoEnabled: boolean;
            backupRestore: boolean;
            description: string;
            price: number;
            customFields: boolean;
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
    createSubscription(body: {
        planId: string;
    }, req: any): Promise<{
        message: string;
        subscription: {
            subscription: {
                plan: {
                    id: string;
                    name: string;
                    auditLogs: boolean;
                    whiteLabel: boolean;
                    customIntegrations: boolean;
                    ssoEnabled: boolean;
                    backupRestore: boolean;
                    description: string;
                    price: number;
                    customFields: boolean;
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
                whiteLabel: boolean;
                customIntegrations: boolean;
                ssoEnabled: boolean;
                backupRestore: boolean;
                description: string;
                price: number;
                customFields: boolean;
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
    createPaymentIntent(req: any, body: {
        amount: number;
        currency?: string;
        description?: string;
        metadata?: any;
        paymentMethodId?: string;
        savePaymentMethod?: boolean;
    }): Promise<{
        success: boolean;
        clientSecret: string | null;
        paymentIntentId: string;
    }>;
    recordOneTimePayment(req: any, body: {
        paymentId: string;
        amount: number;
        description: string;
        metadata?: any;
    }): Promise<{
        success: boolean;
        payment: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            amount: number;
            status: string;
            currency: string;
            description: string | null;
            stripePaymentIntentId: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            completedAt: Date | null;
            refundedAt: Date | null;
            refundAmount: number | null;
            refundReason: string | null;
        };
    }>;
    private applyPaymentBenefits;
}
