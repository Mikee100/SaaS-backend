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
            if (!secretKey) {
                return null;
            }
            return new stripe_1.default(secretKey, {
                apiVersion: '2025-07-30.basil',
                typescript: true,
            });
        }
        catch (error) {
            this.logger.error(`Failed to get Stripe instance for tenant: ${tenantId}`, error);
            return null;
        }
    }
    async createCustomer(tenantId, email, name) {
        if (!this.stripe) {
            throw new Error('Stripe is not configured');
        }
        try {
            this.logger.log(`Creating Stripe customer for tenant: ${tenantId}, email: ${email}`);
            const customer = await this.stripe.customers.create({
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
        if (!this.stripe) {
            throw new Error('Stripe is not configured');
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
            const session = await this.stripe.checkout.sessions.create({
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
        if (!this.stripe) {
            throw new Error('Stripe is not configured');
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
            const session = await this.stripe.billingPortal.sessions.create({
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
        if (!this.stripe) {
            throw new Error('Stripe is not configured');
        }
        try {
            this.logger.log(`Canceling subscription for tenant: ${tenantId}`);
            const subscription = await this.prisma.subscription.findFirst({
                where: { tenantId },
            });
            if (!subscription?.stripeSubscriptionId) {
                throw new common_1.BadRequestException('No active subscription found');
            }
            await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
                cancel_at_period_end: true,
            });
            await this.auditLogService.log(userId, 'subscription_cancel_requested', {
                tenantId,
                subscriptionId: subscription.stripeSubscriptionId,
            });
            this.logger.log(`Subscription cancel requested: ${subscription.stripeSubscriptionId} for tenant: ${tenantId}`);
        }
        catch (error) {
            this.logger.error(`Failed to cancel subscription for tenant: ${tenantId}`, error);
            throw new common_1.InternalServerErrorException('Failed to cancel subscription');
        }
    }
    async getSubscriptionDetails(tenantId) {
        if (!this.stripe) {
            throw new Error('Stripe is not configured');
        }
        try {
            const subscription = await this.prisma.subscription.findFirst({
                where: { tenantId },
            });
            if (!subscription?.stripeSubscriptionId) {
                return null;
            }
            return await this.stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
        }
        catch (error) {
            this.logger.error(`Failed to get subscription details for tenant: ${tenantId}`, error);
            return null;
        }
    }
    async verifyWebhookSignature(payload, signature, secret) {
        if (!this.stripe) {
            throw new Error('Stripe is not configured');
        }
        return this.stripe.webhooks.constructEvent(payload, signature, secret);
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