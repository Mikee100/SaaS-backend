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
    updateSubscription(tenantId: string, data: UpdateSubscriptionDto): Promise<{
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
    cancelSubscription(tenantId: string): Promise<{
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
    getSubscriptionHistory(tenantId: string): Promise<({
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
    createInvoice(subscriptionId: string, amount: number, tenantId: string): Promise<{
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
    }>;
    private calculateEndDate;
    private isPlanUpgrade;
    private handleUpgrade;
    private handleDowngrade;
}
export {};
