"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var StripeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeService = void 0;
const common_1 = require("@nestjs/common");
const stripe_1 = require("stripe");
const prisma_service_1 = require("../prisma.service");
const audit_log_service_1 = require("../audit-log.service");
const tenant_configuration_service_1 = require("../config/tenant-configuration.service");
let StripeService = StripeService_1 = class StripeService {
    prisma;
    auditLogService;
    tenantConfigurationService;
    logger = new common_1.Logger(StripeService_1.name);
    stripe;
    constructor(prisma, auditLogService, tenantConfigurationService) {
        this.prisma = prisma;
        this.auditLogService = auditLogService;
        this.tenantConfigurationService = tenantConfigurationService;
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (stripeSecretKey) {
            this.stripe = new stripe_1.default(stripeSecretKey, {
                apiVersion: '2025-07-30.basil',
                typescript: true,
            });
        }
        else {
            this.stripe = null;
            this.logger.warn('Global Stripe secret key not found. Stripe features will be disabled.');
        }
    }
    async getStripeForTenant(tenantId) {
        try {
            const secretKey = await this.tenantConfigurationService.getStripeSecretKey(tenantId);
            if (secretKey) {
                return new stripe_1.default(secretKey, {
                    apiVersion: '2025-07-30.basil',
                    typescript: true,
                });
            }
            if (this.stripe) {
                return this.stripe;
            }
            return null;
        }
        catch (error) {
            this.logger.error(`Failed to get Stripe instance for tenant: ${tenantId}`, error);
            return null;
        }
    }
    async createCustomer(tenantId, email, name) {
        const stripe = await this.getStripeForTenant(tenantId);
        if (!stripe) {
            throw new Error('Stripe is not configured for this tenant');
        }
        try {
            this.logger.log(`Creating Stripe customer for tenant: ${tenantId}, email: ${email}`);
            const customer = await stripe.customers.create({
                email,
                name,
                metadata: {
                    tenantId,
                },
            });
            await this.prisma.tenant.update({
                where: { id: tenantId },
                data: { stripeCustomerId: customer.id },
            });
            await this.auditLogService.log('system', 'stripe_customer_created', {
                tenantId,
                customerId: customer.id,
                email,
            });
            this.logger.log(`Successfully created Stripe customer: ${customer.id} for tenant: ${tenantId}`);
            return customer;
        }
        catch (error) {
            this.logger.error(`Failed to create Stripe customer for tenant: ${tenantId}`, error);
            throw new common_1.InternalServerErrorException('Failed to create customer');
        }
    }
    async createCheckoutSession(tenantId, priceId, successUrl, cancelUrl, userId) {
        const stripe = await this.getStripeForTenant(tenantId);
        if (!stripe) {
            throw new Error('Stripe is not configured for this tenant');
        }
        try {
            this.logger.log(`Creating checkout session for tenant: ${tenantId}, price: ${priceId}`);
            const tenant = await this.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { stripeCustomerId: true, name: true },
            });
            if (!tenant) {
                throw new common_1.BadRequestException('Tenant not found');
            }
            let customerId = tenant.stripeCustomerId;
            if (!customerId) {
                const customer = await this.createCustomer(tenantId, 'admin@example.com', tenant.name);
                customerId = customer.id;
            }
            const session = await stripe.checkout.sessions.create({
                customer: customerId,
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                mode: 'subscription',
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata: {
                    tenantId,
                    userId,
                },
                subscription_data: {
                    metadata: {
                        tenantId,
                    },
                },
            });
            await this.auditLogService.log(userId, 'stripe_checkout_created', {
                tenantId,
                sessionId: session.id,
                priceId,
            });
            this.logger.log(`Successfully created checkout session: ${session.id} for tenant: ${tenantId}`);
            return session;
        }
        catch (error) {
            this.logger.error(`Failed to create checkout session for tenant: ${tenantId}`, error);
            throw new common_1.InternalServerErrorException('Failed to create checkout session');
        }
    }
    async createBillingPortalSession(tenantId, returnUrl, userId) {
        const stripe = await this.getStripeForTenant(tenantId);
        if (!stripe) {
            throw new Error('Stripe is not configured for this tenant');
        }
        try {
            this.logger.log(`Creating billing portal session for tenant: ${tenantId}`);
            const tenant = await this.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { stripeCustomerId: true },
            });
            if (!tenant?.stripeCustomerId) {
                throw new common_1.BadRequestException('No Stripe customer found for tenant');
            }
            const session = await stripe.billingPortal.sessions.create({
                customer: tenant.stripeCustomerId,
                return_url: returnUrl,
            });
            await this.auditLogService.log(userId, 'stripe_portal_accessed', {
                tenantId,
                sessionId: session.id,
            });
            this.logger.log(`Successfully created billing portal session: ${session.id} for tenant: ${tenantId}`);
            return session;
        }
        catch (error) {
            this.logger.error(`Failed to create billing portal session for tenant: ${tenantId}`, error);
            throw new common_1.InternalServerErrorException('Failed to create billing portal session');
        }
    }
    async handleWebhook(event, userId) {
        if (!this.stripe) {
            this.logger.warn('Stripe is not configured, ignoring webhook');
            return;
        }
        try {
            this.logger.log(`Processing Stripe webhook: ${event.type} for event: ${event.id}`);
            switch (event.type) {
                case 'customer.subscription.created':
                    await this.handleSubscriptionCreated(event.data.object, userId);
                    break;
                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(event.data.object, userId);
                    break;
                case 'customer.subscription.deleted':
                    await this.handleSubscriptionDeleted(event.data.object, userId);
                    break;
                case 'invoice.payment_succeeded':
                    await this.handlePaymentSucceeded(event.data.object, userId);
                    break;
                case 'invoice.payment_failed':
                    await this.handlePaymentFailed(event.data.object, userId);
                    break;
                default:
                    this.logger.log(`Unhandled webhook event type: ${event.type}`);
            }
            await this.auditLogService.log(userId || 'system', 'stripe_webhook_processed', {
                eventType: event.type,
                eventId: event.id,
            });
            this.logger.log(`Successfully processed webhook: ${event.type} for event: ${event.id}`);
        }
        catch (error) {
            this.logger.error(`Failed to process webhook: ${event.type}`, error);
            throw error;
        }
    }
    async handleSubscriptionCreated(subscription, userId) {
        const tenantId = subscription.metadata.tenantId;
        if (!tenantId) {
            this.logger.error('No tenantId in subscription metadata');
            return;
        }
        try {
            const priceId = subscription.items.data[0].price.id;
            let planId = 'basic-plan';
            if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
                planId = 'pro-plan';
            }
            else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
                planId = 'enterprise-plan';
            }
            await this.prisma.subscription.create({
                data: {
                    id: subscription.id,
                    tenantId,
                    planId,
                    stripeSubscriptionId: subscription.id,
                    stripePriceId: priceId,
                    status: subscription.status,
                    currentPeriodStart: new Date(subscription.current_period_start * 1000),
                    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                    cancelAtPeriodEnd: subscription.cancel_at_period_end,
                },
            });
            await this.auditLogService.log(userId || 'system', 'subscription_created', {
                tenantId,
                subscriptionId: subscription.id,
                status: subscription.status,
            });
            this.logger.log(`Subscription created: ${subscription.id} for tenant: ${tenantId}`);
        }
        catch (error) {
            this.logger.error(`Failed to handle subscription created: ${subscription.id}`, error);
        }
    }
    async handleSubscriptionUpdated(subscription, userId) {
        const tenantId = subscription.metadata.tenantId;
        if (!tenantId) {
            this.logger.error('No tenantId in subscription metadata');
            return;
        }
        try {
            await this.prisma.subscription.update({
                where: { stripeSubscriptionId: subscription.id },
                data: {
                    status: subscription.status,
                    currentPeriodStart: new Date(subscription.current_period_start * 1000),
                    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                    cancelAtPeriodEnd: subscription.cancel_at_period_end,
                },
            });
            await this.auditLogService.log(userId || 'system', 'subscription_updated', {
                tenantId,
                subscriptionId: subscription.id,
                status: subscription.status,
            });
            this.logger.log(`Subscription updated: ${subscription.id} for tenant: ${tenantId}`);
        }
        catch (error) {
            this.logger.error(`Failed to handle subscription updated: ${subscription.id}`, error);
        }
    }
    async handleSubscriptionDeleted(subscription, userId) {
        const tenantId = subscription.metadata.tenantId;
        if (!tenantId) {
            this.logger.error('No tenantId in subscription metadata');
            return;
        }
        try {
            await this.prisma.subscription.update({
                where: { stripeSubscriptionId: subscription.id },
                data: {
                    status: 'canceled',
                    canceledAt: new Date(),
                },
            });
            await this.auditLogService.log(userId || 'system', 'subscription_canceled', {
                tenantId,
                subscriptionId: subscription.id,
            });
            this.logger.log(`Subscription canceled: ${subscription.id} for tenant: ${tenantId}`);
        }
        catch (error) {
            this.logger.error(`Failed to handle subscription deleted: ${subscription.id}`, error);
        }
    }
    async handlePaymentSucceeded(invoice, userId) {
        if (!this.stripe) {
            this.logger.warn('Stripe is not configured, ignoring payment succeeded');
            return;
        }
        try {
            let tenantId = '';
            if (invoice.customer) {
                const customer = await this.stripe.customers.retrieve(invoice.customer);
                tenantId = customer.metadata?.tenantId || '';
            }
            if (!tenantId) {
                this.logger.error('No tenantId found for invoice:', invoice.id);
                return;
            }
            await this.prisma.invoice.create({
                data: {
                    id: invoice.id,
                    tenantId,
                    stripeInvoiceId: invoice.id,
                    amount: invoice.amount_paid,
                    currency: invoice.currency,
                    status: invoice.status || 'paid',
                    dueDate: new Date(invoice.due_date * 1000),
                    paidAt: new Date(),
                },
            });
            await this.auditLogService.log(userId || 'system', 'payment_succeeded', {
                invoiceId: invoice.id,
                amount: invoice.amount_paid,
            });
            this.logger.log(`Payment succeeded: ${invoice.id}`);
        }
        catch (error) {
            this.logger.error(`Failed to handle payment succeeded: ${invoice.id}`, error);
        }
    }
    async handlePaymentFailed(invoice, userId) {
        try {
            await this.auditLogService.log(userId || 'system', 'payment_failed', {
                invoiceId: invoice.id,
                amount: invoice.amount_due,
            });
            this.logger.log(`Payment failed: ${invoice.id}`);
        }
        catch (error) {
            this.logger.error(`Failed to handle payment failed: ${invoice.id}`, error);
        }
    }
    async cancelSubscription(tenantId, userId) {
        const stripe = await this.getStripeForTenant(tenantId);
        if (!stripe) {
            throw new Error('Stripe is not configured for this tenant');
        }
        try {
            this.logger.log(`Canceling subscription for tenant: ${tenantId}`);
            const subscription = await this.prisma.subscription.findFirst({
                where: {
                    tenantId,
                    status: { in: ['active', 'past_due', 'trialing'] }
                },
            });
            if (!subscription) {
                throw new common_1.BadRequestException('No active subscription found for this tenant');
            }
            if (!subscription.stripeSubscriptionId) {
                await this.prisma.subscription.update({
                    where: { id: subscription.id },
                    data: {
                        status: 'canceled',
                        cancelAtPeriodEnd: true,
                        canceledAt: new Date()
                    }
                });
                await this.auditLogService.log(userId, 'subscription_canceled_locally', {
                    tenantId,
                    subscriptionId: subscription.id,
                    reason: 'No Stripe subscription ID associated'
                });
                this.logger.log(`Subscription canceled locally (no Stripe ID): ${subscription.id} for tenant: ${tenantId}`);
                return;
            }
            if (subscription.cancelAtPeriodEnd) {
                throw new common_1.BadRequestException('Subscription is already scheduled for cancellation');
            }
            await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
                cancel_at_period_end: true,
            });
            await this.prisma.subscription.update({
                where: { id: subscription.id },
                data: { cancelAtPeriodEnd: true }
            });
            await this.auditLogService.log(userId, 'subscription_cancel_requested', {
                tenantId,
                subscriptionId: subscription.stripeSubscriptionId,
            });
            this.logger.log(`Subscription cancel requested: ${subscription.stripeSubscriptionId} for tenant: ${tenantId}`);
        }
        catch (error) {
            this.logger.error(`Failed to cancel subscription for tenant: ${tenantId}`, error);
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('Failed to cancel subscription');
        }
    }
    async getSubscriptionDetails(tenantId) {
        const stripe = await this.getStripeForTenant(tenantId);
        if (!stripe) {
            throw new Error('Stripe is not configured for this tenant');
        }
        try {
            const subscription = await this.prisma.subscription.findFirst({
                where: {
                    tenantId,
                    status: { in: ['active', 'past_due', 'trialing', 'canceled'] }
                },
            });
            if (!subscription?.stripeSubscriptionId) {
                return null;
            }
            return await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
        }
        catch (error) {
            this.logger.error(`Failed to get subscription details for tenant: ${tenantId}`, error);
            return null;
        }
    }
    async cleanupOrphanedSubscriptions(tenantId) {
        try {
            const orphanedSubscriptions = await this.prisma.subscription.findMany({
                where: {
                    tenantId,
                    stripeSubscriptionId: null,
                    status: { in: ['active', 'past_due', 'trialing'] }
                }
            });
            for (const subscription of orphanedSubscriptions) {
                await this.prisma.subscription.update({
                    where: { id: subscription.id },
                    data: {
                        status: 'canceled',
                        cancelAtPeriodEnd: true,
                        canceledAt: new Date()
                    }
                });
                this.logger.log(`Cleaned up orphaned subscription: ${subscription.id} for tenant: ${tenantId}`);
            }
        }
        catch (error) {
            this.logger.error(`Failed to cleanup orphaned subscriptions for tenant: ${tenantId}`, error);
        }
    }
    async verifyWebhookSignature(payload, signature, secret) {
        if (!this.stripe) {
            throw new Error('Stripe is not configured');
        }
        return this.stripe.webhooks.constructEvent(payload, signature, secret);
    }
    async createStripeProductsAndPrices(tenantId) {
        const stripe = await this.getStripeForTenant(tenantId);
        if (!stripe) {
            throw new Error('Stripe is not configured for this tenant');
        }
        try {
            this.logger.log(`Creating Stripe products and prices for tenant: ${tenantId}`);
            const basicProduct = await stripe.products.create({
                name: 'Basic Plan',
                description: 'Basic plan for small businesses',
                metadata: {
                    tenantId,
                    planType: 'basic',
                },
            });
            const basicPrice = await stripe.prices.create({
                product: basicProduct.id,
                unit_amount: 0,
                currency: 'usd',
                recurring: {
                    interval: 'month',
                },
                metadata: {
                    tenantId,
                    planType: 'basic',
                },
            });
            const proProduct = await stripe.products.create({
                name: 'Pro Plan',
                description: 'Professional plan for growing businesses',
                metadata: {
                    tenantId,
                    planType: 'pro',
                },
            });
            const proPrice = await stripe.prices.create({
                product: proProduct.id,
                unit_amount: 2900,
                currency: 'usd',
                recurring: {
                    interval: 'month',
                },
                metadata: {
                    tenantId,
                    planType: 'pro',
                },
            });
            const enterpriseProduct = await stripe.products.create({
                name: 'Enterprise Plan',
                description: 'Enterprise plan for large organizations',
                metadata: {
                    tenantId,
                    planType: 'enterprise',
                },
            });
            const enterprisePrice = await stripe.prices.create({
                product: enterpriseProduct.id,
                unit_amount: 9900,
                currency: 'usd',
                recurring: {
                    interval: 'month',
                },
                metadata: {
                    tenantId,
                    planType: 'enterprise',
                },
            });
            await Promise.all([
                this.tenantConfigurationService.setStripePriceId(tenantId, 'basic', basicPrice.id),
                this.tenantConfigurationService.setStripePriceId(tenantId, 'pro', proPrice.id),
                this.tenantConfigurationService.setStripePriceId(tenantId, 'enterprise', enterprisePrice.id),
            ]);
            this.logger.log(`Successfully created Stripe products and prices for tenant: ${tenantId}`);
            return {
                basicPriceId: basicPrice.id,
                proPriceId: proPrice.id,
                enterprisePriceId: enterprisePrice.id,
            };
        }
        catch (error) {
            this.logger.error(`Failed to create Stripe products and prices for tenant: ${tenantId}`, error);
            throw new common_1.InternalServerErrorException('Failed to create Stripe products and prices');
        }
    }
    async updateStripePrices(tenantId, prices) {
        const stripe = await this.getStripeForTenant(tenantId);
        if (!stripe) {
            throw new Error('Stripe is not configured for this tenant');
        }
        try {
            this.logger.log(`Updating Stripe prices for tenant: ${tenantId}`);
            const results = {};
            if (prices.basicPrice !== undefined) {
                const basicPriceId = await this.tenantConfigurationService.getStripePriceId(tenantId, 'basic');
                if (basicPriceId) {
                    const basicPrice = await stripe.prices.create({
                        product: (await stripe.prices.retrieve(basicPriceId)).product,
                        unit_amount: prices.basicPrice * 100,
                        currency: 'usd',
                        recurring: {
                            interval: 'month',
                        },
                        metadata: {
                            tenantId,
                            planType: 'basic',
                        },
                    });
                    await this.tenantConfigurationService.setStripePriceId(tenantId, 'basic', basicPrice.id);
                    results.basicPriceId = basicPrice.id;
                }
            }
            if (prices.proPrice !== undefined) {
                const proPriceId = await this.tenantConfigurationService.getStripePriceId(tenantId, 'pro');
                if (proPriceId) {
                    const proPrice = await stripe.prices.create({
                        product: (await stripe.prices.retrieve(proPriceId)).product,
                        unit_amount: prices.proPrice * 100,
                        currency: 'usd',
                        recurring: {
                            interval: 'month',
                        },
                        metadata: {
                            tenantId,
                            planType: 'pro',
                        },
                    });
                    await this.tenantConfigurationService.setStripePriceId(tenantId, 'pro', proPrice.id);
                    results.proPriceId = proPrice.id;
                }
            }
            if (prices.enterprisePrice !== undefined) {
                const enterprisePriceId = await this.tenantConfigurationService.getStripePriceId(tenantId, 'enterprise');
                if (enterprisePriceId) {
                    const enterprisePrice = await stripe.prices.create({
                        product: (await stripe.prices.retrieve(enterprisePriceId)).product,
                        unit_amount: prices.enterprisePrice * 100,
                        currency: 'usd',
                        recurring: {
                            interval: 'month',
                        },
                        metadata: {
                            tenantId,
                            planType: 'enterprise',
                        },
                    });
                    await this.tenantConfigurationService.setStripePriceId(tenantId, 'enterprise', enterprisePrice.id);
                    results.enterprisePriceId = enterprisePrice.id;
                }
            }
            const [currentBasicPriceId, currentProPriceId, currentEnterprisePriceId] = await Promise.all([
                this.tenantConfigurationService.getStripePriceId(tenantId, 'basic'),
                this.tenantConfigurationService.getStripePriceId(tenantId, 'pro'),
                this.tenantConfigurationService.getStripePriceId(tenantId, 'enterprise'),
            ]);
            return {
                basicPriceId: results.basicPriceId || currentBasicPriceId || '',
                proPriceId: results.proPriceId || currentProPriceId || '',
                enterprisePriceId: results.enterprisePriceId || currentEnterprisePriceId || '',
            };
        }
        catch (error) {
            this.logger.error(`Failed to update Stripe prices for tenant: ${tenantId}`, error);
            throw new common_1.InternalServerErrorException('Failed to update Stripe prices');
        }
    }
    async createPaymentIntent(tenantId, amount, currency, description, metadata = {}) {
        const stripe = await this.getStripeForTenant(tenantId);
        if (!stripe) {
            throw new Error('Stripe is not configured for this tenant');
        }
        try {
            this.logger.log(`Creating payment intent for tenant: ${tenantId}, amount: ${amount}`);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(amount * 100),
                currency,
                description,
                metadata: {
                    tenantId,
                    ...metadata,
                },
                automatic_payment_methods: {
                    enabled: true,
                },
            });
            await this.auditLogService.log('system', 'payment_intent_created', {
                tenantId,
                paymentIntentId: paymentIntent.id,
                amount,
                currency,
            });
            this.logger.log(`Successfully created payment intent: ${paymentIntent.id} for tenant: ${tenantId}`);
            return paymentIntent;
        }
        catch (error) {
            this.logger.error(`Failed to create payment intent for tenant: ${tenantId}`, error);
            throw new common_1.InternalServerErrorException('Failed to create payment intent');
        }
    }
    async createInvoice(tenantId, subscriptionId, amount, currency) {
        const stripe = await this.getStripeForTenant(tenantId);
        if (!stripe) {
            throw new Error('Stripe is not configured for this tenant');
        }
        try {
            this.logger.log(`Creating invoice for tenant: ${tenantId}, subscription: ${subscriptionId}`);
            const tenant = await this.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { stripeCustomerId: true },
            });
            if (!tenant?.stripeCustomerId) {
                throw new Error('No Stripe customer found for tenant');
            }
            const invoice = await stripe.invoices.create({
                customer: tenant.stripeCustomerId,
                subscription: subscriptionId,
                collection_method: 'charge_automatically',
                metadata: {
                    tenantId,
                },
            });
            await stripe.invoiceItems.create({
                customer: tenant.stripeCustomerId,
                invoice: invoice.id,
                amount: Math.round(amount * 100),
                currency,
                description: 'Subscription payment',
            });
            await this.auditLogService.log('system', 'invoice_created', {
                tenantId,
                invoiceId: invoice.id,
                amount,
                currency,
            });
            this.logger.log(`Successfully created invoice: ${invoice.id} for tenant: ${tenantId}`);
            return invoice;
        }
        catch (error) {
            this.logger.error(`Failed to create invoice for tenant: ${tenantId}`, error);
            throw new common_1.InternalServerErrorException('Failed to create invoice');
        }
    }
    async createRefund(tenantId, paymentIntentId, amount, reason) {
        const stripe = await this.getStripeForTenant(tenantId);
        if (!stripe) {
            throw new Error('Stripe is not configured for this tenant');
        }
        try {
            this.logger.log(`Creating refund for tenant: ${tenantId}, payment: ${paymentIntentId}`);
            const refund = await stripe.refunds.create({
                payment_intent: paymentIntentId,
                amount: amount ? Math.round(amount * 100) : undefined,
                reason: reason,
                metadata: {
                    tenantId,
                },
            });
            await this.auditLogService.log('system', 'refund_created', {
                tenantId,
                refundId: refund.id,
                paymentIntentId,
                amount,
                reason,
            });
            this.logger.log(`Successfully created refund: ${refund.id} for tenant: ${tenantId}`);
            return refund;
        }
        catch (error) {
            this.logger.error(`Failed to create refund for tenant: ${tenantId}`, error);
            throw new common_1.InternalServerErrorException('Failed to create refund');
        }
    }
    async getPaymentMethods(tenantId, customerId) {
        const stripe = await this.getStripeForTenant(tenantId);
        if (!stripe) {
            throw new Error('Stripe is not configured for this tenant');
        }
        try {
            this.logger.log(`Getting payment methods for tenant: ${tenantId}, customer: ${customerId}`);
            const paymentMethods = await stripe.paymentMethods.list({
                customer: customerId,
                type: 'card',
            });
            this.logger.log(`Successfully retrieved ${paymentMethods.data.length} payment methods for tenant: ${tenantId}`);
            return paymentMethods.data;
        }
        catch (error) {
            this.logger.error(`Failed to get payment methods for tenant: ${tenantId}`, error);
            throw new common_1.InternalServerErrorException('Failed to get payment methods');
        }
    }
    async attachPaymentMethod(tenantId, customerId, paymentMethodId) {
        const stripe = await this.getStripeForTenant(tenantId);
        if (!stripe) {
            throw new Error('Stripe is not configured for this tenant');
        }
        try {
            this.logger.log(`Attaching payment method ${paymentMethodId} to customer ${customerId} for tenant: ${tenantId}`);
            await stripe.paymentMethods.attach(paymentMethodId, {
                customer: customerId,
            });
            await this.auditLogService.log('system', 'payment_method_attached', {
                tenantId,
                customerId,
                paymentMethodId,
            });
            this.logger.log(`Successfully attached payment method ${paymentMethodId} for tenant: ${tenantId}`);
        }
        catch (error) {
            this.logger.error(`Failed to attach payment method for tenant: ${tenantId}`, error);
            throw new common_1.InternalServerErrorException('Failed to attach payment method');
        }
    }
    async detachPaymentMethod(tenantId, paymentMethodId) {
        const stripe = await this.getStripeForTenant(tenantId);
        if (!stripe) {
            throw new Error('Stripe is not configured for this tenant');
        }
        try {
            this.logger.log(`Detaching payment method ${paymentMethodId} for tenant: ${tenantId}`);
            await stripe.paymentMethods.detach(paymentMethodId);
            await this.auditLogService.log('system', 'payment_method_detached', {
                tenantId,
                paymentMethodId,
            });
            this.logger.log(`Successfully detached payment method ${paymentMethodId} for tenant: ${tenantId}`);
        }
        catch (error) {
            this.logger.error(`Failed to detach payment method for tenant: ${tenantId}`, error);
            throw new common_1.InternalServerErrorException('Failed to detach payment method');
        }
    }
};
exports.StripeService = StripeService;
exports.StripeService = StripeService = StripeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_log_service_1.AuditLogService,
        tenant_configuration_service_1.TenantConfigurationService])
], StripeService);
//# sourceMappingURL=stripe.service.js.map