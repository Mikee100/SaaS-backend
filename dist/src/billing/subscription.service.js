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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const billing_service_1 = require("./billing.service");
let SubscriptionService = class SubscriptionService {
    prisma;
    billingService;
    constructor(prisma, billingService) {
        this.prisma = prisma;
        this.billingService = billingService;
    }
    async createSubscription(data) {
        try {
            console.log('Creating subscription with data:', data);
            const plan = await this.prisma.plan.findUnique({
                where: { id: data.planId },
            });
            if (!plan) {
                console.error('Plan not found:', data.planId);
                throw new common_1.NotFoundException('Plan not found');
            }
            console.log('Found plan:', plan.name);
            const existingSubscription = await this.prisma.subscription.findFirst({
                where: {
                    tenantId: data.tenantId,
                    status: 'active',
                },
                include: {
                    plan: true,
                },
            });
            if (existingSubscription) {
                console.log('Tenant has existing subscription, upgrading to new plan');
                return await this.handleUpgrade(existingSubscription, plan);
            }
            const now = new Date();
            const endDate = this.calculateEndDate(plan.interval);
            console.log('Creating subscription with dates:', { now, endDate });
            const subscription = await this.prisma.subscription.create({
                data: {
                    tenantId: data.tenantId,
                    planId: data.planId,
                    status: 'active',
                    currentPeriodStart: now,
                    currentPeriodEnd: endDate,
                    stripeSubscriptionId: 'manual_' + Date.now(),
                    stripeCustomerId: 'cust_' + data.tenantId,
                    stripePriceId: 'price_' + plan.id,
                    stripeCurrentPeriodEnd: endDate,
                    cancelAtPeriodEnd: false,
                    userId: 'system',
                },
                include: {
                    plan: true,
                },
            });
            console.log('Subscription created successfully:', subscription.id);
            return subscription;
        }
        catch (error) {
            console.error('Error in createSubscription:', error);
            throw error;
        }
    }
    async updateSubscription(tenantId, data) {
        const currentSubscription = await this.prisma.subscription.findFirst({
            where: {
                tenantId,
                status: 'active',
            },
            include: {
                plan: true,
            },
        });
        if (!currentSubscription) {
            throw new common_1.NotFoundException('No active subscription found');
        }
        const newPlan = await this.prisma.plan.findUnique({
            where: { id: data.planId },
        });
        if (!newPlan) {
            throw new common_1.NotFoundException('Plan not found');
        }
        const isUpgrade = this.isPlanUpgrade(currentSubscription.plan.name, newPlan.name);
        if (isUpgrade) {
            return await this.handleUpgrade(currentSubscription, newPlan);
        }
        else {
            return await this.handleDowngrade(currentSubscription, newPlan, data.effectiveDate);
        }
    }
    async cancelSubscription(tenantId) {
        const subscription = await this.prisma.subscription.findFirst({
            where: {
                tenantId,
                status: 'active',
            },
        });
        if (!subscription) {
            throw new common_1.NotFoundException('No active subscription found');
        }
        return await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                status: 'cancelled',
                canceledAt: new Date(),
            },
        });
    }
    async getSubscriptionHistory(tenantId) {
        return await this.prisma.subscription.findMany({
            where: { tenantId },
            include: {
                plan: true,
                invoices: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });
    }
    async createInvoice(subscriptionId, amount, tenantId) {
        const invoiceNumber = 'INV-' + Date.now();
        return await this.prisma.invoice.create({
            data: {
                number: invoiceNumber,
                subscriptionId,
                tenantId,
                amount,
                status: 'open',
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });
    }
    calculateEndDate(interval) {
        const now = new Date();
        switch (interval) {
            case 'monthly':
                return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
            case 'yearly':
                return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
            default:
                return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        }
    }
    isPlanUpgrade(currentPlan, newPlan) {
        const planHierarchy = { 'Basic': 1, 'Pro': 2, 'Enterprise': 3 };
        const currentLevel = planHierarchy[currentPlan] || 0;
        const newLevel = planHierarchy[newPlan] || 0;
        return newLevel > currentLevel;
    }
    async handleUpgrade(currentSubscription, newPlan) {
        const daysRemaining = Math.ceil((currentSubscription.currentPeriodEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        const totalDays = Math.ceil((currentSubscription.currentPeriodEnd.getTime() - currentSubscription.currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
        const prorationRatio = daysRemaining / totalDays;
        const currentPlanPrice = currentSubscription.plan.price;
        const newPlanPrice = newPlan.price;
        const proratedCredit = currentPlanPrice * prorationRatio;
        const proratedCharge = newPlanPrice * prorationRatio;
        const netCharge = Math.max(0, proratedCharge - proratedCredit);
        const updatedSubscription = await this.prisma.subscription.update({
            where: { id: currentSubscription.id },
            data: {
                planId: newPlan.id,
            },
            include: {
                plan: true,
            },
        });
        if (netCharge > 0) {
            await this.createInvoice(currentSubscription.id, netCharge, currentSubscription.tenantId);
        }
        return {
            subscription: updatedSubscription,
            proration: {
                credit: proratedCredit,
                charge: proratedCharge,
                netCharge,
            },
        };
    }
    async handleDowngrade(currentSubscription, newPlan, effectiveDate) {
        const effective = effectiveDate || currentSubscription.currentPeriodEnd;
        return {
            message: 'Downgrade scheduled for next billing cycle',
            effectiveDate: effective,
            currentPlan: currentSubscription.plan.name,
            newPlan: newPlan.name,
        };
    }
};
exports.SubscriptionService = SubscriptionService;
exports.SubscriptionService = SubscriptionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        billing_service_1.BillingService])
], SubscriptionService);
//# sourceMappingURL=subscription.service.js.map