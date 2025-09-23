import { SubscriptionService } from './subscription.service';
export declare class SubscriptionController {
    private readonly subscriptionService;
    constructor(subscriptionService: SubscriptionService);
    createSubscription(body: {
        planId: string;
        paymentMethodId?: string;
    }, req: any): Promise<{
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
    updateSubscription(body: {
        planId: string;
        effectiveDate?: Date;
    }, req: any): Promise<{
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
    cancelSubscription(req: any): Promise<{
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
    getSubscriptionHistory(req: any): Promise<{
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
}
