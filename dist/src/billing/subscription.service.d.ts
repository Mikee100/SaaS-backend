import { PrismaService } from '../prisma.service';
import { BillingService } from './billing.service';
interface CreateSubscriptionDto {
    tenantId: string;
    planId: string;
    paymentMethodId?: string;
}
interface UpdateSubscriptionDto {
    planId: string;
    effectiveDate?: Date;
}
export declare class SubscriptionService {
    private prisma;
    private billingService;
    constructor(prisma: PrismaService, billingService: BillingService);
    createSubscription(data: CreateSubscriptionDto): Promise<{
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
    })>;
    updateSubscription(tenantId: string, data: UpdateSubscriptionDto): Promise<{
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
    } | {
        message: string;
        effectiveDate: any;
        currentPlan: any;
        newPlan: any;
    }>;
    cancelSubscription(tenantId: string): Promise<{
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
    }>;
    getSubscriptionHistory(tenantId: string): Promise<({
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
        invoices: {
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
        }[];
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
    })[]>;
    createInvoice(subscriptionId: string, amount: number, tenantId: string): Promise<{
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
    }>;
    private calculateEndDate;
    private isPlanUpgrade;
    private handleUpgrade;
    private handleDowngrade;
}
export {};
