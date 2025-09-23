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
    getPlanLimits(req: any): Promise<{
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
                name: any;
                price: any;
            } | null;
        } | null;
    }[]>;
    createSubscription(body: {
        planId: string;
    }, req: any): Promise<{
        message: string;
        subscription: {
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
        } | {
            subscription: {
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
            };
            proration: {
                credit: number;
                charge: number;
                netCharge: number;
            };
        };
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
    getSubscriptionDetails(req: any): Promise<{
        id: string;
        status: string;
        stripeSubscriptionId: string;
        stripeCustomerId: string;
    } | null>;
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
            description: string | null;
            createdAt: Date;
            tenantId: string;
            updatedAt: Date;
            amount: number;
            status: string;
            currency: string;
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
