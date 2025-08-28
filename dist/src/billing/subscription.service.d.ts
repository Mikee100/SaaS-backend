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
    private readonly prisma;
    private readonly billingService;
    constructor(prisma: PrismaService, billingService: BillingService);
    createSubscription(data: CreateSubscriptionDto): Promise<{
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
    } | ({
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
    })>;
    updateSubscription(tenantId: string, data: UpdateSubscriptionDto): Promise<{
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
    cancelSubscription(tenantId: string): Promise<{
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
    getSubscriptionHistory(tenantId: string): Promise<({
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
    createInvoice(subscriptionId: string, amount: number, tenantId: string): Promise<{
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
    }>;
    private calculateEndDate;
    private isPlanUpgrade;
    private handleUpgrade;
    private handleDowngrade;
}
export {};
