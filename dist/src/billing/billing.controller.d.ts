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
        createdAt: Date;
        updatedAt: Date;
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
        isActive: boolean;
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
            createdAt: Date;
            updatedAt: Date;
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
            isActive: boolean;
        };
        startDate: Date;
        endDate: Date;
        cancelledAt: Date | null;
        currentPeriodStart?: undefined;
        currentPeriodEnd?: undefined;
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
    }>;
    createSubscription(req: any, data: {
        planId: string;
        paymentMethodId?: string;
    }): Promise<{
        plan: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
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
            isActive: boolean;
        };
    } & {
        id: string;
        tenantId: string;
        planId: string;
        status: string;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        cancelledAt: Date | null;
        trialEnd: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateSubscription(req: any, data: {
        planId: string;
        effectiveDate?: Date;
    }): Promise<{
        subscription: {
            plan: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
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
                isActive: boolean;
            };
        } & {
            id: string;
            tenantId: string;
            planId: string;
            status: string;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            cancelAtPeriodEnd: boolean;
            cancelledAt: Date | null;
            trialEnd: Date | null;
            createdAt: Date;
            updatedAt: Date;
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
        planId: string;
        status: string;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        cancelledAt: Date | null;
        trialEnd: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getSubscriptionHistory(req: any): Promise<({
        plan: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
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
            isActive: boolean;
        };
        invoices: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            currency: string;
            subscriptionId: string;
            amount: number;
            dueDate: Date;
            paidAt: Date | null;
            invoiceNumber: string;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
        }[];
    } & {
        id: string;
        tenantId: string;
        planId: string;
        status: string;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        cancelledAt: Date | null;
        trialEnd: Date | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    getInvoices(req: any): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        currency: string;
        subscriptionId: string;
        amount: number;
        dueDate: Date;
        paidAt: Date | null;
        invoiceNumber: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    addPaymentMethod(req: any, data: any): Promise<{
        message: string;
    }>;
    getPaymentMethods(req: any): Promise<never[]>;
}
