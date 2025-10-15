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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var BillingController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingController = void 0;
const common_1 = require("@nestjs/common");
const billing_service_1 = require("./billing.service");
const stripe_service_1 = require("./stripe.service");
const subscription_service_1 = require("./subscription.service");
const passport_1 = require("@nestjs/passport");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const permissions_guard_1 = require("../auth/permissions.guard");
const trial_guard_1 = require("../auth/trial.guard");
const prisma_service_1 = require("../prisma.service");
let BillingController = BillingController_1 = class BillingController {
    billingService;
    stripeService;
    subscriptionService;
    prisma;
    logger = new common_1.Logger(BillingController_1.name);
    constructor(billingService, stripeService, subscriptionService, prisma) {
        this.billingService = billingService;
        this.stripeService = stripeService;
        this.subscriptionService = subscriptionService;
        this.prisma = prisma;
    }
    async getAllTenantSubscriptions() {
        return this.billingService.getAllTenantSubscriptions();
    }
    async testEndpoint() {
        try {
            const plans = await this.billingService.getPlans();
            return {
                message: 'Billing service is working',
                plansCount: plans.length,
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            console.error('Test endpoint error:', error);
            return {
                error: error.message,
                timestamp: new Date().toISOString(),
            };
        }
    }
    async testSubscription(req) {
        try {
            if (!req.user?.tenantId) {
                return {
                    error: 'No tenant ID found in user object',
                    user: req.user,
                    timestamp: new Date().toISOString(),
                };
            }
            const subscription = await this.billingService.getCurrentSubscription(req.user.tenantId);
            return {
                message: 'Subscription test successful',
                tenantId: req.user.tenantId,
                subscription,
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            console.error('Subscription test error:', error);
            return {
                error: error.message,
                timestamp: new Date().toISOString(),
            };
        }
    }
    async healthCheck() {
        return {
            status: 'ok',
            service: 'billing',
            timestamp: new Date().toISOString(),
        };
    }
    async getPlans() {
        return this.billingService.getPlans();
    }
    async getCurrentSubscriptionWithPermissions(req) {
        try {
            if (!req.user?.tenantId) {
                throw new Error('No tenant ID found in user object');
            }
            return this.billingService.getCurrentSubscription(req.user.tenantId);
        }
        catch (error) {
            throw error;
        }
    }
    async getPlanLimits(req) {
        try {
            if (!req.user?.tenantId) {
                throw new Error('No tenant ID found in user object');
            }
            return this.billingService.getPlanLimits(req.user.tenantId);
        }
        catch (error) {
            throw error;
        }
    }
    async getInvoices(req) {
        return this.billingService.getInvoices(req.user.tenantId);
    }
    async createSubscription(body, req) {
        try {
            if (!req.user?.tenantId) {
                throw new Error('No tenant ID found in user object');
            }
            const subscription = await this.subscriptionService.createSubscription({
                tenantId: req.user.tenantId,
                planId: body.planId,
            });
            return {
                message: 'Subscription created successfully',
                subscription,
            };
        }
        catch (error) {
            throw error;
        }
    }
    async createCheckoutSession(body, req) {
        const session = await this.stripeService.createCheckoutSession(req.user.tenantId, body.priceId, body.successUrl, body.cancelUrl, req.user.id);
        return { sessionId: session.id, url: session.url };
    }
    async createPortalSession(body, req) {
        const session = await this.stripeService.createBillingPortalSession(req.user.tenantId, body.returnUrl, req.user.id);
        return { url: session.url };
    }
    async cancelSubscription(req) {
        await this.stripeService.cancelSubscription(req.user.tenantId, req.user.id);
        return {
            message: 'Subscription will be canceled at the end of the current period',
        };
    }
    async getSubscriptionDetails(req) {
        const subscription = await this.stripeService.getSubscription(req.user.tenantId);
        return subscription;
    }
    async cleanupOrphanedSubscriptions(req) {
        await this.stripeService.cleanupOrphanedSubscriptions(req.user.tenantId);
        return { message: 'Orphaned subscriptions cleaned up successfully' };
    }
    async handleWebhook(req) {
        const sig = req.headers['stripe-signature'];
        const rawBody = req.rawBody;
        if (!sig || !rawBody) {
            throw new Error('Missing stripe signature or body');
        }
        try {
            const event = await this.stripeService.verifyWebhookSignature(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
            await this.stripeService.handleWebhook(event);
            return { received: true };
        }
        catch (err) {
            console.error('Webhook signature verification failed:', err);
            throw new Error('Webhook signature verification failed');
        }
    }
    async createPaymentIntent(req, body) {
        try {
            const { amount, currency = 'usd', description, metadata, paymentMethodId, savePaymentMethod = false, } = body;
            if (!amount || amount < 50) {
                throw new Error('Invalid amount');
            }
            let customerId = req.user.tenant.stripeCustomerId;
            if (!customerId && req.user.tenant.contactEmail) {
                const customer = await this.stripeService.createCustomer(req.user.tenantId, req.user.tenant.contactEmail, req.user.tenant.name);
                customerId = customer.id;
                await this.prisma.tenant.update({
                    where: { id: req.user.tenantId },
                    data: { stripeCustomerId: customerId },
                });
            }
            const paymentIntent = await this.stripeService.createPaymentIntent(req.user.tenantId, {
                amount: Math.round(amount * 100),
                currency,
                description,
                metadata: {
                    ...metadata,
                    tenantId: req.user.tenantId,
                    userId: req.user.userId,
                    type: 'one_time',
                },
                paymentMethod: paymentMethodId,
                confirm: !!paymentMethodId,
                customerId,
                setupFutureUsage: savePaymentMethod ? 'off_session' : undefined,
            });
            return {
                success: true,
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
            };
        }
        catch (error) {
            this.logger.error('Error creating payment intent:', error);
            throw new Error('Failed to create payment intent');
        }
    }
    async recordOneTimePayment(req, body) {
        try {
            const { paymentId, amount, description, metadata = {} } = body;
            const paymentIntent = await this.stripeService.retrievePaymentIntent(req.user.tenantId, paymentId);
            if (paymentIntent.status !== 'succeeded') {
                throw new Error('Payment not completed');
            }
            const now = new Date();
            const payment = await this.prisma.payment.create({
                data: {
                    id: paymentId,
                    amount: amount / 100,
                    currency: paymentIntent.currency,
                    status: paymentIntent.status,
                    description,
                    metadata: {
                        ...(metadata || {}),
                        userId: req.user.userId,
                        stripe_payment_intent_id: paymentIntent.id,
                    },
                    stripePaymentIntentId: paymentIntent.id,
                    tenantId: req.user.tenantId,
                    createdAt: now,
                    updatedAt: now,
                },
            });
            await this.applyPaymentBenefits(req.user.tenantId, amount, metadata);
            return { success: true, payment };
        }
        catch (error) {
            this.logger.error('Error recording one-time payment:', error);
            throw new Error('Failed to record payment');
        }
    }
    async applyPaymentBenefits(tenantId, amount, metadata) {
        await this.prisma.$executeRaw `
      UPDATE "Tenant" 
      SET credits = COALESCE(credits, 0) + ${Math.floor(amount / 100)}
      WHERE id = ${tenantId}
    `;
    }
};
exports.BillingController = BillingController;
__decorate([
    (0, common_1.Get)('admin/billing/tenants'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('edit_billing'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getAllTenantSubscriptions", null);
__decorate([
    (0, common_1.Get)('test'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "testEndpoint", null);
__decorate([
    (0, common_1.Get)('test-subscription'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "testSubscription", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "healthCheck", null);
__decorate([
    (0, common_1.Get)('plans'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard, trial_guard_1.TrialGuard),
    (0, permissions_decorator_1.Permissions)('view_billing'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getPlans", null);
__decorate([
    (0, common_1.Get)('subscription-with-permissions'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard, trial_guard_1.TrialGuard),
    (0, permissions_decorator_1.Permissions)('view_billing'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getCurrentSubscriptionWithPermissions", null);
__decorate([
    (0, common_1.Get)('limits'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getPlanLimits", null);
__decorate([
    (0, common_1.Get)('invoices'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard, trial_guard_1.TrialGuard),
    (0, permissions_decorator_1.Permissions)('view_billing'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getInvoices", null);
__decorate([
    (0, common_1.Post)('create-subscription'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard, trial_guard_1.TrialGuard),
    (0, permissions_decorator_1.Permissions)('edit_billing'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "createSubscription", null);
__decorate([
    (0, common_1.Post)('create-checkout-session'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard, trial_guard_1.TrialGuard),
    (0, permissions_decorator_1.Permissions)('edit_billing'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "createCheckoutSession", null);
__decorate([
    (0, common_1.Post)('create-portal-session'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard, trial_guard_1.TrialGuard),
    (0, permissions_decorator_1.Permissions)('edit_billing'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "createPortalSession", null);
__decorate([
    (0, common_1.Post)('cancel-subscription'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard, trial_guard_1.TrialGuard),
    (0, permissions_decorator_1.Permissions)('edit_billing'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "cancelSubscription", null);
__decorate([
    (0, common_1.Get)('subscription-details'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard, trial_guard_1.TrialGuard),
    (0, permissions_decorator_1.Permissions)('view_billing'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getSubscriptionDetails", null);
__decorate([
    (0, common_1.Post)('cleanup-orphaned-subscriptions'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard, trial_guard_1.TrialGuard),
    (0, permissions_decorator_1.Permissions)('edit_billing'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "cleanupOrphanedSubscriptions", null);
__decorate([
    (0, common_1.Post)('webhook'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "handleWebhook", null);
__decorate([
    (0, common_1.Post)('create-payment-intent'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "createPaymentIntent", null);
__decorate([
    (0, common_1.Post)('record-one-time-payment'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "recordOneTimePayment", null);
exports.BillingController = BillingController = BillingController_1 = __decorate([
    (0, common_1.Controller)('billing'),
    __metadata("design:paramtypes", [billing_service_1.BillingService,
        stripe_service_1.StripeService,
        subscription_service_1.SubscriptionService,
        prisma_service_1.PrismaService])
], BillingController);
//# sourceMappingURL=billing.controller.js.map