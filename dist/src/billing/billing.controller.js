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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingController = void 0;
const common_1 = require("@nestjs/common");
const billing_service_1 = require("./billing.service");
const stripe_service_1 = require("./stripe.service");
const passport_1 = require("@nestjs/passport");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const permissions_guard_1 = require("../auth/permissions.guard");
let BillingController = class BillingController {
    billingService;
    stripeService;
    constructor(billingService, stripeService) {
        this.billingService = billingService;
        this.stripeService = stripeService;
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
    async getPlans() {
        return this.billingService.getPlans();
    }
    async getCurrentSubscription(req) {
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
        return { message: 'Subscription will be canceled at the end of the current period' };
    }
    async getSubscriptionDetails(req) {
        const subscription = await this.stripeService.getSubscriptionDetails(req.user.tenantId);
        return subscription;
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
};
exports.BillingController = BillingController;
__decorate([
    (0, common_1.Get)('test'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "testEndpoint", null);
__decorate([
    (0, common_1.Get)('plans'),
    (0, permissions_decorator_1.Permissions)('view_billing'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getPlans", null);
__decorate([
    (0, common_1.Get)('subscription'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getCurrentSubscription", null);
__decorate([
    (0, common_1.Get)('limits'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getPlanLimits", null);
__decorate([
    (0, common_1.Get)('invoices'),
    (0, permissions_decorator_1.Permissions)('view_billing'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getInvoices", null);
__decorate([
    (0, common_1.Post)('create-checkout-session'),
    (0, permissions_decorator_1.Permissions)('edit_billing'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "createCheckoutSession", null);
__decorate([
    (0, common_1.Post)('create-portal-session'),
    (0, permissions_decorator_1.Permissions)('edit_billing'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "createPortalSession", null);
__decorate([
    (0, common_1.Post)('cancel-subscription'),
    (0, permissions_decorator_1.Permissions)('edit_billing'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "cancelSubscription", null);
__decorate([
    (0, common_1.Get)('subscription-details'),
    (0, permissions_decorator_1.Permissions)('view_billing'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getSubscriptionDetails", null);
__decorate([
    (0, common_1.Post)('webhook'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "handleWebhook", null);
exports.BillingController = BillingController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard),
    (0, common_1.Controller)('billing'),
    __metadata("design:paramtypes", [billing_service_1.BillingService,
        stripe_service_1.StripeService])
], BillingController);
//# sourceMappingURL=billing.controller.js.map