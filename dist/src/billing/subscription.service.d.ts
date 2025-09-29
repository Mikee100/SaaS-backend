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
            Plan: {
                id: string;
                name: string;
                price: number;
                description: string;
                customFields: boolean;
                backupRestore: boolean;
                customIntegrations: boolean;
                ssoEnabled: boolean;
                whiteLabel: boolean;
                stripePriceId: string | null;
                isActive: boolean;
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
                dataExport: boolean;
                dedicatedSupport: boolean;
            };
        } & {
            id: string;
            tenantId: string;
            userId: string;
            stripeCustomerId: string;
            status: string;
            planId: string;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            cancelAtPeriodEnd: boolean;
            canceledAt: Date | null;
            stripePriceId: string;
            stripeSubscriptionId: string;
            stripeCurrentPeriodEnd: Date;
            trialEnd: Date | null;
            trialStart: Date | null;
        };
        proration: {
            credit: number;
            charge: number;
            netCharge: number;
        };
    } | ({
        Plan: {
            id: string;
            name: string;
            price: number;
            description: string;
            customFields: boolean;
            backupRestore: boolean;
            customIntegrations: boolean;
            ssoEnabled: boolean;
            whiteLabel: boolean;
            stripePriceId: string | null;
            isActive: boolean;
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
            dataExport: boolean;
            dedicatedSupport: boolean;
        };
    } & {
        id: string;
        tenantId: string;
        userId: string;
        stripeCustomerId: string;
        status: string;
        planId: string;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        canceledAt: Date | null;
        stripePriceId: string;
        stripeSubscriptionId: string;
        stripeCurrentPeriodEnd: Date;
        trialEnd: Date | null;
        trialStart: Date | null;
    })>;
    updateSubscription(tenantId: string, data: UpdateSubscriptionDto): Promise<{
        subscription: {
            Plan: {
                id: string;
                name: string;
                price: number;
                description: string;
                customFields: boolean;
                backupRestore: boolean;
                customIntegrations: boolean;
                ssoEnabled: boolean;
                whiteLabel: boolean;
                stripePriceId: string | null;
                isActive: boolean;
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
                dataExport: boolean;
                dedicatedSupport: boolean;
            };
        } & {
            id: string;
            tenantId: string;
            userId: string;
            stripeCustomerId: string;
            status: string;
            planId: string;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            cancelAtPeriodEnd: boolean;
            canceledAt: Date | null;
            stripePriceId: string;
            stripeSubscriptionId: string;
            stripeCurrentPeriodEnd: Date;
            trialEnd: Date | null;
            trialStart: Date | null;
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
        tenantId: string;
        userId: string;
        stripeCustomerId: string;
        status: string;
        planId: string;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        canceledAt: Date | null;
        stripePriceId: string;
        stripeSubscriptionId: string;
        stripeCurrentPeriodEnd: Date;
        trialEnd: Date | null;
        trialStart: Date | null;
    }>;
    getSubscriptionHistory(tenantId: string): Promise<({
        Invoice: {
            number: string;
            id: string;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            amount: number;
            subscriptionId: string | null;
            dueDate: Date | null;
            paidAt: Date | null;
        }[];
        Plan: {
            id: string;
            name: string;
            price: number;
            description: string;
            customFields: boolean;
            backupRestore: boolean;
            customIntegrations: boolean;
            ssoEnabled: boolean;
            whiteLabel: boolean;
            stripePriceId: string | null;
            isActive: boolean;
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
            dataExport: boolean;
            dedicatedSupport: boolean;
        };
    } & {
        id: string;
        tenantId: string;
        userId: string;
        stripeCustomerId: string;
        status: string;
        planId: string;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        canceledAt: Date | null;
        stripePriceId: string;
        stripeSubscriptionId: string;
        stripeCurrentPeriodEnd: Date;
        trialEnd: Date | null;
        trialStart: Date | null;
    })[]>;
    createInvoice(subscriptionId: string, amount: number, tenantId: string): Promise<{
        number: string;
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        amount: number;
        subscriptionId: string | null;
        dueDate: Date | null;
        paidAt: Date | null;
    }>;
    private calculateEndDate;
    private isPlanUpgrade;
    private handleUpgrade;
    private handleDowngrade;
}
export {};
