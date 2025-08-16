import Stripe from 'stripe';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';
import { TenantConfigurationService } from '../config/tenant-configuration.service';
export declare class StripeService {
    private readonly prisma;
    private readonly auditLogService;
    private readonly tenantConfigurationService;
    private readonly logger;
    private readonly stripe;
    constructor(prisma: PrismaService, auditLogService: AuditLogService, tenantConfigurationService: TenantConfigurationService);
    private getStripeForTenant;
    createCustomer(tenantId: string, email: string, name: string): Promise<Stripe.Customer>;
    createCheckoutSession(tenantId: string, priceId: string, successUrl: string, cancelUrl: string, userId: string, customerEmail?: string): Promise<Stripe.Checkout.Session>;
    createBillingPortalSession(tenantId: string, returnUrl: string, userId: string): Promise<Stripe.BillingPortal.Session>;
    handleWebhook(event: Stripe.Event, userId?: string): Promise<void>;
    private handleSubscriptionCreated;
    private handleSubscriptionUpdated;
    private handleSubscriptionDeleted;
    private handlePaymentSucceeded;
    private handlePaymentFailed;
    cancelSubscription(tenantId: string, userId: string): Promise<void>;
    getSubscription(tenantId: string): Promise<{
        id: string;
        status: string;
        stripeSubscriptionId: string;
        stripeCustomerId: string;
    } | null>;
    cleanupOrphanedSubscriptions(tenantId: string): Promise<void>;
    verifyWebhookSignature(payload: Buffer, signature: string, secret: string): Promise<Stripe.Event>;
    createStripeProductsAndPrices(tenantId: string): Promise<{
        basicPriceId: string;
        proPriceId: string;
        enterprisePriceId: string;
    }>;
    updateStripePrices(tenantId: string, prices: {
        basicPrice?: number;
        proPrice?: number;
        enterprisePrice?: number;
    }): Promise<{
        basicPriceId: string;
        proPriceId: string;
        enterprisePriceId: string;
    }>;
    createPaymentIntent(tenantId: string, params: {
        amount: number;
        currency?: string;
        description?: string;
        metadata?: Record<string, any>;
        paymentMethod?: string;
        confirm?: boolean;
        customerId?: string;
        setupFutureUsage?: 'on_session' | 'off_session';
    }): Promise<Stripe.PaymentIntent>;
    createInvoice(tenantId: string, subscriptionId: string, amount: number, currency: string): Promise<Stripe.Invoice>;
    createRefund(tenantId: string, paymentIntentId: string, amount?: number, reason?: string): Promise<Stripe.Refund>;
    getPaymentMethods(tenantId: string, customerId: string): Promise<Stripe.PaymentMethod[]>;
    attachPaymentMethod(tenantId: string, customerId: string, paymentMethodId: string): Promise<void>;
    detachPaymentMethod(tenantId: string, paymentMethodId: string): Promise<void>;
    createOneTimePaymentIntent(tenantId: string, amount: number, currency: string, description: string, metadata?: Record<string, any>, paymentMethod?: string, confirm?: boolean, savePaymentMethod?: boolean, customerId?: string): Promise<Stripe.PaymentIntent>;
    retrievePaymentIntent(tenantId: string, paymentIntentId: string): Promise<Stripe.PaymentIntent>;
    confirmPaymentIntent(tenantId: string, paymentIntentId: string, paymentMethodId: string): Promise<Stripe.PaymentIntent>;
}
