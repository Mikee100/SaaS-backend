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
    }>;
    updateSubscription(tenantId: string, data: UpdateSubscriptionDto): Promise<{
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
    getSubscriptionHistory(tenantId: string): Promise<{
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
    }[]>;
    createInvoice(subscriptionId: string, amount: number, tenantId: string): Promise<{
        number: string;
        id: string;
        createdAt: Date;
        tenantId: string;
        updatedAt: Date;
        amount: number;
        status: string;
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
