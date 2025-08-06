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
var PaymentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const stripe_service_1 = require("./stripe.service");
const audit_log_service_1 = require("../audit-log.service");
let PaymentService = PaymentService_1 = class PaymentService {
    prisma;
    stripeService;
    auditLogService;
    logger = new common_1.Logger(PaymentService_1.name);
    constructor(prisma, stripeService, auditLogService) {
        this.prisma = prisma;
        this.stripeService = stripeService;
        this.auditLogService = auditLogService;
    }
    async processOneTimePayment(tenantId, amount, currency, description, metadata = {}) {
        try {
            this.logger.log(`Processing one-time payment for tenant: ${tenantId}, amount: ${amount}`);
            const mockPaymentId = `pi_${Date.now()}`;
            const mockClientSecret = `pi_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`;
            await this.auditLogService.log('system', 'payment_created', {
                tenantId,
                paymentId: mockPaymentId,
                amount,
                currency,
            });
            return {
                paymentId: mockPaymentId,
                clientSecret: mockClientSecret,
                amount,
                currency,
            };
        }
        catch (error) {
            this.logger.error(`Failed to process one-time payment for tenant: ${tenantId}`, error);
            throw error;
        }
    }
    async confirmPayment(paymentId, paymentIntentId) {
        try {
            this.logger.log(`Confirming payment: ${paymentId}`);
            await this.auditLogService.log('system', 'payment_confirmed', {
                paymentId,
                paymentIntentId,
            });
            return { success: true, paymentId };
        }
        catch (error) {
            this.logger.error(`Failed to confirm payment: ${paymentId}`, error);
            throw error;
        }
    }
    async generateInvoice(subscriptionId, amount, currency = 'usd') {
        try {
            const subscription = await this.prisma.subscription.findUnique({
                where: { id: subscriptionId },
                include: { plan: true, tenant: true },
            });
            if (!subscription) {
                throw new Error('Subscription not found');
            }
            const stripeInvoice = await this.stripeService.createInvoice(subscription.tenantId, subscription.stripeSubscriptionId, amount, currency);
            const invoice = await this.prisma.invoice.create({
                data: {
                    tenantId: subscription.tenantId,
                    subscriptionId: subscription.id,
                    stripeInvoiceId: stripeInvoice.id,
                    amount,
                    currency,
                    status: 'draft',
                    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    description: `Invoice for ${subscription.plan.name} plan`,
                },
            });
            await this.auditLogService.log('system', 'invoice_generated', {
                tenantId: subscription.tenantId,
                invoiceId: invoice.id,
                amount,
                subscriptionId: subscription.id,
            });
            return invoice;
        }
        catch (error) {
            this.logger.error(`Failed to generate invoice for subscription: ${subscriptionId}`, error);
            throw error;
        }
    }
    async getPaymentAnalytics(tenantId, period = 'month') {
        try {
            this.logger.log(`Getting payment analytics for tenant: ${tenantId}, period: ${period}`);
            const mockAnalytics = {
                period,
                totalRevenue: 1250.00,
                paymentCount: 15,
                averagePayment: 83.33,
                paymentMethods: [
                    {
                        paymentMethod: 'card',
                        _count: { paymentMethod: 12 },
                        _sum: { amount: 1000.00 }
                    },
                    {
                        paymentMethod: 'bank_transfer',
                        _count: { paymentMethod: 3 },
                        _sum: { amount: 250.00 }
                    }
                ],
                currency: 'USD'
            };
            await this.auditLogService.log('system', 'payment_analytics_viewed', {
                tenantId,
                period,
            });
            return mockAnalytics;
        }
        catch (error) {
            this.logger.error(`Failed to get payment analytics for tenant: ${tenantId}`, error);
            throw error;
        }
    }
    async getPaymentHistory(tenantId, limit = 50, offset = 0) {
        try {
            this.logger.log(`Getting payment history for tenant: ${tenantId}, limit: ${limit}, offset: ${offset}`);
            const mockHistory = [
                {
                    id: '1',
                    amount: 99.99,
                    currency: 'USD',
                    status: 'completed',
                    description: 'Monthly subscription payment',
                    createdAt: new Date().toISOString(),
                    type: 'payment'
                },
                {
                    id: '2',
                    amount: 29.99,
                    currency: 'USD',
                    status: 'completed',
                    description: 'One-time payment',
                    createdAt: new Date(Date.now() - 86400000).toISOString(),
                    type: 'payment'
                },
                {
                    id: '3',
                    amount: 199.99,
                    currency: 'USD',
                    status: 'pending',
                    description: 'Annual subscription',
                    createdAt: new Date(Date.now() - 172800000).toISOString(),
                    type: 'invoice'
                }
            ];
            await this.auditLogService.log('system', 'payment_history_viewed', {
                tenantId,
                limit,
                offset,
            });
            return mockHistory;
        }
        catch (error) {
            this.logger.error(`Failed to get payment history for tenant: ${tenantId}`, error);
            throw error;
        }
    }
    async refundPayment(paymentId, amount, reason) {
        try {
            const payment = await this.prisma.payment.findUnique({
                where: { id: paymentId },
            });
            if (!payment) {
                throw new Error('Payment not found');
            }
            if (payment.status !== 'completed') {
                throw new Error('Payment must be completed to refund');
            }
            const refund = await this.stripeService.createRefund(payment.tenantId, payment.stripePaymentIntentId, amount || payment.amount, reason);
            await this.prisma.payment.update({
                where: { id: paymentId },
                data: {
                    status: 'refunded',
                    refundedAt: new Date(),
                    refundAmount: amount || payment.amount,
                    refundReason: reason,
                },
            });
            await this.auditLogService.log('system', 'payment_refunded', {
                tenantId: payment.tenantId,
                paymentId: payment.id,
                refundAmount: amount || payment.amount,
                reason,
            });
            return { success: true, refundId: refund.id };
        }
        catch (error) {
            this.logger.error(`Failed to refund payment: ${paymentId}`, error);
            throw error;
        }
    }
    async getPaymentMethods(tenantId) {
        try {
            this.logger.log(`Getting payment methods for tenant: ${tenantId}`);
            const mockMethods = [
                {
                    id: 'pm_1',
                    type: 'card',
                    card: {
                        brand: 'visa',
                        last4: '4242',
                        expMonth: 12,
                        expYear: 2025
                    }
                },
                {
                    id: 'pm_2',
                    type: 'card',
                    card: {
                        brand: 'mastercard',
                        last4: '5555',
                        expMonth: 6,
                        expYear: 2026
                    }
                }
            ];
            await this.auditLogService.log('system', 'payment_methods_viewed', {
                tenantId,
            });
            return mockMethods;
        }
        catch (error) {
            this.logger.error(`Failed to get payment methods for tenant: ${tenantId}`, error);
            return [];
        }
    }
    async addPaymentMethod(tenantId, paymentMethodId) {
        try {
            const tenant = await this.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { stripeCustomerId: true },
            });
            if (!tenant?.stripeCustomerId) {
                throw new Error('No Stripe customer found for tenant');
            }
            await this.stripeService.attachPaymentMethod(tenantId, tenant.stripeCustomerId, paymentMethodId);
            await this.auditLogService.log('system', 'payment_method_added', {
                tenantId,
                paymentMethodId,
            });
            return { success: true };
        }
        catch (error) {
            this.logger.error(`Failed to add payment method for tenant: ${tenantId}`, error);
            throw error;
        }
    }
    async removePaymentMethod(tenantId, paymentMethodId) {
        try {
            await this.stripeService.detachPaymentMethod(tenantId, paymentMethodId);
            await this.auditLogService.log('system', 'payment_method_removed', {
                tenantId,
                paymentMethodId,
            });
            return { success: true };
        }
        catch (error) {
            this.logger.error(`Failed to remove payment method for tenant: ${tenantId}`, error);
            throw error;
        }
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = PaymentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        stripe_service_1.StripeService,
        audit_log_service_1.AuditLogService])
], PaymentService);
//# sourceMappingURL=payment.service.js.map