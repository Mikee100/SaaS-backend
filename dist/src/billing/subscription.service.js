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
                select: {
                    id: true,
                    name: true,
                    description: true,
                    price: true,
                    interval: true,
                    isActive: true,
                    maxUsers: true,
                    maxProducts: true,
                    maxBranches: true,
                    maxSalesPerMonth: true,
                    stripePriceId: true,
                    analyticsEnabled: true,
                    advancedReports: true,
                    prioritySupport: true,
                    customBranding: true,
                    apiAccess: true,
                    bulkOperations: true,
                    dataExport: true,
                    customFields: true,
                    advancedSecurity: true,
                    whiteLabel: true,
                    dedicatedSupport: true,
                    ssoEnabled: true,
                    auditLogs: true,
                    backupRestore: true,
                    customIntegrations: true,
                },
            });
            if (!plan) {
                console.error('Plan not found:', data.planId);
                throw new common_1.NotFoundException('Plan not found');
            }
            console.log('Found plan:', plan.name);
            const existingSubscription = await this.prisma.subscription.findFirst({
                where: {
                    tenantId: data.tenantId,
                },
                include: {
                    Plan: true,
                    Tenant: true,
                },
            });
            if (existingSubscription) {
                return await this.handleUpgrade(existingSubscription, plan);
            }
            const now = new Date();
            let endDate = this.calculateEndDate(plan.interval);
            let status = 'active';
            let trialEnd = null;
            let trialStart = null;
            let isTrial = false;
            if (plan.name.toLowerCase().includes('trial')) {
                trialEnd = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
                endDate = trialEnd;
                status = 'trialing';
                trialStart = now;
                isTrial = true;
            }
            console.log('Creating subscription with dates:', { now, endDate, status });
            const subscriptionData = {
                id: `sub_${Date.now()}`,
                tenantId: data.tenantId,
                planId: data.planId,
                status,
                currentPeriodStart: now,
                currentPeriodEnd: endDate,
                stripeSubscriptionId: 'manual_' + Date.now(),
                stripeCustomerId: 'cust_' + data.tenantId,
                stripePriceId: plan.stripePriceId ?? '',
                stripeCurrentPeriodEnd: endDate,
                cancelAtPeriodEnd: false,
                trialEnd,
                trialStart,
                isTrial,
                canceledAt: null,
            };
            if (data.userId !== undefined && data.userId !== null) {
                subscriptionData.userId = data.userId;
            }
            const subscription = await this.prisma.subscription.create({
                data: subscriptionData,
                include: {
                    Plan: true,
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
                Plan: true,
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
        const currentPlan = await this.prisma.plan.findUnique({
            where: { id: currentSubscription.planId },
        });
        if (!currentPlan) {
            throw new common_1.NotFoundException('Current plan not found');
        }
        const isUpgrade = this.isPlanUpgrade(currentPlan.name, newPlan.name);
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
                cancelAtPeriodEnd: true,
                canceledAt: new Date(),
            },
        });
    }
    async getSubscriptionHistory(tenantId) {
        return await this.prisma.subscription.findMany({
            where: { tenantId },
            include: {
                Plan: true,
                Invoice: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
            orderBy: { currentPeriodStart: 'desc' },
        });
    }
    async createInvoice(subscriptionId, amount, tenantId) {
        const invoiceNumber = 'INV-' + Date.now();
        return await this.prisma.invoice.create({
            data: {
                id: `inv_${Date.now()}`,
                number: invoiceNumber,
                subscriptionId,
                tenantId,
                amount,
                status: 'open',
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
        const planHierarchy = { Basic: 1, Pro: 2, Enterprise: 3 };
        const currentLevel = planHierarchy[currentPlan] || 0;
        const newLevel = planHierarchy[newPlan] || 0;
        return newLevel > currentLevel;
    }
    async handleUpgrade(currentSubscription, newPlan) {
        const daysRemaining = Math.ceil((currentSubscription.currentPeriodEnd.getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24));
        const totalDays = Math.ceil((currentSubscription.currentPeriodEnd.getTime() -
            currentSubscription.currentPeriodStart.getTime()) /
            (1000 * 60 * 60 * 24));
        const prorationRatio = daysRemaining / totalDays;
        const currentPlanPrice = currentSubscription.Plan.price;
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
                Plan: true,
            },
        });
        if (netCharge > 0) {
            await this.createInvoice(currentSubscription.id, netCharge, currentSubscription.tenantId);
        }
        const { Plan, ...sub } = updatedSubscription;
        const transformedSubscription = { ...sub, plan: Plan };
        return {
            subscription: transformedSubscription,
            proration: {
                credit: proratedCredit,
                charge: proratedCharge,
                netCharge,
            },
        };
    }
    async handleDowngrade(currentSubscription, newPlan, effectiveDate) {
        const effective = effectiveDate || currentSubscription.currentPeriodEnd;
        const updatedSubscription = await this.prisma.subscription.update({
            where: { id: currentSubscription.id },
            data: {
                scheduledPlanId: newPlan.id,
                scheduledEffectiveDate: effective,
            },
            include: {
                Plan: true,
            },
        });
        const { Plan, ...sub } = updatedSubscription;
        const transformedSubscription = { ...sub, plan: Plan };
        return {
            message: 'Downgrade scheduled successfully',
            subscription: transformedSubscription,
            effectiveDate: effective,
            currentPlan: currentSubscription.Plan.name,
            newPlan: newPlan.name,
        };
    }
    async getCurrentSubscription(tenantId) {
        const subscription = await this.prisma.subscription.findFirst({
            where: {
                tenantId,
                status: 'active',
            },
            include: {
                Plan: true,
                ScheduledPlan: true,
            },
        });
        if (!subscription) {
            throw new common_1.NotFoundException('No active subscription found');
        }
        const { Plan, ScheduledPlan, ...sub } = subscription;
        return {
            ...sub,
            plan: Plan,
            scheduledPlan: ScheduledPlan,
        };
    }
    async upgradeSubscription(tenantId, planId, effectiveDate) {
        const currentSubscription = await this.prisma.subscription.findFirst({
            where: {
                tenantId,
                status: 'active',
            },
            include: {
                Plan: true,
            },
        });
        if (!currentSubscription) {
            throw new common_1.NotFoundException('No active subscription found');
        }
        const newPlan = await this.prisma.plan.findUnique({
            where: { id: planId },
        });
        if (!newPlan) {
            throw new common_1.NotFoundException('Plan not found');
        }
        const isUpgrade = this.isPlanUpgrade(currentSubscription.Plan.name, newPlan.name);
        if (isUpgrade) {
            return await this.handleUpgrade(currentSubscription, newPlan);
        }
        else {
            return await this.handleDowngrade(currentSubscription, newPlan, effectiveDate);
        }
    }
    async resumeSubscription(tenantId) {
        const subscription = await this.prisma.subscription.findFirst({
            where: {
                tenantId,
                status: 'active',
                cancelAtPeriodEnd: true,
            },
        });
        if (!subscription) {
            throw new common_1.NotFoundException('No cancelled subscription found to resume');
        }
        const updatedSubscription = await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                cancelAtPeriodEnd: false,
                canceledAt: null,
            },
            include: {
                Plan: true,
            },
        });
        const { Plan, ...sub } = updatedSubscription;
        return { ...sub, plan: Plan };
    }
    async getPlans() {
        const plans = await this.prisma.plan.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                description: true,
                price: true,
                interval: true,
                maxUsers: true,
                maxProducts: true,
                maxSalesPerMonth: true,
                analyticsEnabled: true,
                advancedReports: true,
                prioritySupport: true,
                customBranding: true,
                apiAccess: true,
                bulkOperations: true,
                dataExport: true,
                customFields: true,
                advancedSecurity: true,
                whiteLabel: true,
                dedicatedSupport: true,
                ssoEnabled: true,
                auditLogs: true,
                backupRestore: true,
                customIntegrations: true,
                PlanFeatureOnPlan: {
                    include: {
                        PlanFeature: true,
                    },
                },
            },
        });
        return plans.map(plan => ({
            ...plan,
            features: plan.PlanFeatureOnPlan
                .filter(pf => pf.isEnabled)
                .map(pf => pf.PlanFeature.featureName),
        }));
    }
    async getInvoices(tenantId) {
        return await this.prisma.invoice.findMany({
            where: { tenantId },
            include: {
                Subscription: {
                    include: {
                        Plan: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createTrialSubscription(tenantId, durationHours, planId) {
        const now = new Date();
        const trialEnd = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
        const plan = await this.prisma.plan.findUnique({
            where: { id: planId },
        });
        if (!plan) {
            throw new common_1.NotFoundException('Plan not found');
        }
        const subscription = await this.prisma.subscription.create({
            data: {
                id: `trial_${Date.now()}`,
                tenantId,
                planId,
                status: 'trialing',
                currentPeriodStart: now,
                currentPeriodEnd: trialEnd,
                stripeSubscriptionId: 'trial_' + Date.now(),
                stripeCustomerId: 'trial_' + tenantId,
                stripePriceId: plan.stripePriceId ?? '',
                stripeCurrentPeriodEnd: trialEnd,
                cancelAtPeriodEnd: false,
                trialEnd,
                trialStart: now,
                isTrial: true,
                canceledAt: null,
            },
            include: {
                Plan: true,
            },
        });
        return subscription;
    }
    async checkTrialStatus(tenantId) {
        const subscription = await this.prisma.subscription.findFirst({
            where: {
                tenantId,
                isTrial: true,
                status: {
                    in: ['trialing', 'expired'],
                },
            },
            include: {
                Plan: true,
            },
            orderBy: {
                currentPeriodStart: 'desc',
            },
        });
        if (!subscription) {
            return { isTrial: false, trialExpired: false };
        }
        const now = new Date();
        const trialExpired = subscription.trialEnd ? now > subscription.trialEnd : false;
        if (trialExpired && subscription.status === 'trialing') {
            await this.prisma.subscription.update({
                where: { id: subscription.id },
                data: { status: 'expired' },
            });
        }
        return {
            isTrial: true,
            trialExpired,
            trialEnd: subscription.trialEnd,
            remainingTime: trialExpired || !subscription.trialEnd ? 0 : Math.max(0, subscription.trialEnd.getTime() - now.getTime()),
        };
    }
    async isSubscriptionValid(tenantId) {
        const subscription = await this.prisma.subscription.findFirst({
            where: {
                tenantId,
            },
            include: {
                Plan: true,
            },
            orderBy: {
                currentPeriodStart: 'desc',
            },
        });
        if (!subscription) {
            return { valid: false, reason: 'No subscription found' };
        }
        const now = new Date();
        if (subscription.status === 'expired' || subscription.status === 'canceled') {
            return { valid: false, reason: 'Subscription expired or canceled' };
        }
        if (subscription.status === 'trialing') {
            const trialExpired = subscription.trialEnd ? now > subscription.trialEnd : false;
            if (trialExpired) {
                await this.prisma.subscription.update({
                    where: { id: subscription.id },
                    data: { status: 'expired' },
                });
                return { valid: false, reason: 'Trial period has expired' };
            }
            return {
                valid: true,
                status: 'trialing',
                remainingTime: subscription.trialEnd ? subscription.trialEnd.getTime() - now.getTime() : 0,
            };
        }
        if (subscription.status === 'active') {
            const subscriptionExpired = subscription.currentPeriodEnd ? now > subscription.currentPeriodEnd : false;
            if (subscriptionExpired) {
                await this.prisma.subscription.update({
                    where: { id: subscription.id },
                    data: { status: 'expired' },
                });
                return { valid: false, reason: 'Subscription period has expired' };
            }
            return {
                valid: true,
                status: 'active',
                remainingTime: subscription.currentPeriodEnd ? subscription.currentPeriodEnd.getTime() - now.getTime() : 0,
            };
        }
        return { valid: false, reason: `Invalid subscription status: ${subscription.status}` };
    }
    async canAddUser(tenantId) {
        const subscription = await this.getCurrentSubscription(tenantId);
        if (!subscription || !subscription.plan) {
            return false;
        }
        const plan = subscription.plan;
        const maxUsers = plan.maxUsers || 0;
        if (maxUsers === 0) {
            return true;
        }
        const currentUsers = await this.prisma.user.count({
            where: { tenantId },
        });
        return currentUsers < maxUsers;
    }
    async canAddBranch(tenantId) {
        const subscription = await this.getCurrentSubscription(tenantId);
        if (!subscription || !subscription.plan) {
            return false;
        }
        const plan = subscription.plan;
        const maxBranches = plan.maxBranches || 0;
        if (maxBranches === 0) {
            return true;
        }
        const currentBranches = await this.prisma.branch.count({
            where: { tenantId },
        });
        return currentBranches < maxBranches;
    }
    async canAddProduct(tenantId) {
        const subscription = await this.getCurrentSubscription(tenantId);
        if (!subscription || !subscription.plan) {
            return false;
        }
        const plan = subscription.plan;
        const maxProducts = plan.maxProducts || 0;
        if (maxProducts === 0) {
            return true;
        }
        const currentProducts = await this.prisma.product.count({
            where: { tenantId },
        });
        return currentProducts < maxProducts;
    }
    async canCreateSale(tenantId) {
        const subscription = await this.getCurrentSubscription(tenantId);
        if (!subscription || !subscription.plan) {
            return false;
        }
        const plan = subscription.plan;
        const maxSalesPerMonth = plan.maxSalesPerMonth || 0;
        if (maxSalesPerMonth === 0) {
            return true;
        }
        const currentMonthStart = new Date();
        currentMonthStart.setDate(1);
        currentMonthStart.setHours(0, 0, 0, 0);
        const currentMonthSales = await this.prisma.sale.count({
            where: {
                tenantId,
                createdAt: {
                    gte: currentMonthStart,
                },
            },
        });
        return currentMonthSales < maxSalesPerMonth;
    }
    async getTrialUsage(tenantId) {
        const subscription = await this.prisma.subscription.findFirst({
            where: {
                tenantId,
                status: 'trialing',
            },
            include: {
                Plan: true,
            },
            orderBy: {
                currentPeriodStart: 'desc',
            },
        });
        if (!subscription || !subscription.isTrial || !subscription.trialStart) {
            return { isTrial: false, usage: null };
        }
        const trialStart = subscription.trialStart;
        const now = new Date();
        const userCount = await this.prisma.user.count({
            where: {
                tenantId,
                createdAt: {
                    gte: trialStart,
                },
            },
        });
        const productCount = await this.prisma.product.count({
            where: {
                tenantId,
                createdAt: {
                    gte: trialStart,
                },
            },
        });
        const branchCount = await this.prisma.branch.count({
            where: {
                tenantId,
                createdAt: {
                    gte: trialStart,
                },
            },
        });
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const salesCount = await this.prisma.sale.count({
            where: {
                tenantId,
                createdAt: {
                    gte: currentMonthStart,
                },
            },
        });
        const plan = subscription.Plan;
        const limits = {
            maxUsers: plan.maxUsers || 0,
            maxProducts: plan.maxProducts || 0,
            maxBranches: plan.maxBranches || 0,
            maxSalesPerMonth: plan.maxSalesPerMonth || 0,
        };
        const usagePercentages = {
            users: limits.maxUsers > 0 ? (userCount / limits.maxUsers) * 100 : 0,
            products: limits.maxProducts > 0 ? (productCount / limits.maxProducts) * 100 : 0,
            branches: limits.maxBranches > 0 ? (branchCount / limits.maxBranches) * 100 : 0,
            sales: limits.maxSalesPerMonth > 0 ? (salesCount / limits.maxSalesPerMonth) * 100 : 0,
        };
        const approachingLimits = {
            users: usagePercentages.users >= 80,
            products: usagePercentages.products >= 80,
            branches: usagePercentages.branches >= 80,
            sales: usagePercentages.sales >= 80,
        };
        return {
            isTrial: true,
            trialStart: subscription.trialStart,
            trialEnd: subscription.trialEnd,
            daysRemaining: subscription.trialEnd ? Math.ceil((subscription.trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0,
            usage: {
                users: {
                    current: userCount,
                    limit: limits.maxUsers,
                    percentage: Math.round(usagePercentages.users * 100) / 100,
                    approachingLimit: approachingLimits.users,
                },
                products: {
                    current: productCount,
                    limit: limits.maxProducts,
                    percentage: Math.round(usagePercentages.products * 100) / 100,
                    approachingLimit: approachingLimits.products,
                },
                branches: {
                    current: branchCount,
                    limit: limits.maxBranches,
                    percentage: Math.round(usagePercentages.branches * 100) / 100,
                    approachingLimit: approachingLimits.branches,
                },
                salesThisMonth: {
                    current: salesCount,
                    limit: limits.maxSalesPerMonth,
                    percentage: Math.round(usagePercentages.sales * 100) / 100,
                    approachingLimit: approachingLimits.sales,
                },
            },
            planName: plan.name,
        };
    }
    async getPlanLimits(tenantId) {
        try {
            const userCount = await this.prisma.user.count({ where: { tenantId } });
            const productCount = await this.prisma.product.count({ where: { tenantId } });
            const branchCount = await this.prisma.branch.count({ where: { tenantId } });
            const currentMonthStart = new Date();
            currentMonthStart.setDate(1);
            currentMonthStart.setHours(0, 0, 0, 0);
            const salesCount = await this.prisma.sale.count({
                where: {
                    tenantId,
                    createdAt: { gte: currentMonthStart },
                },
            });
            const allSubscriptions = await this.prisma.subscription.findMany({
                where: { tenantId },
                include: { Plan: true },
                orderBy: { currentPeriodStart: 'desc' },
            });
            console.log('All subscriptions for tenant', tenantId, ':', allSubscriptions.map(s => ({ id: s.id, status: s.status, planName: s.Plan?.name })));
            const subscription = await this.prisma.subscription.findFirst({
                where: {
                    tenantId,
                    status: {
                        in: ['active', 'trialing', 'past_due'],
                    },
                },
                include: {
                    Plan: true,
                },
                orderBy: {
                    currentPeriodStart: 'desc',
                },
            });
            let currentPlan = null;
            let features = {
                analytics: false,
                advanced_reports: false,
                custom_branding: false,
                api_access: false,
                bulk_operations: false,
                data_export: false,
                custom_fields: false,
            };
            if (subscription && subscription.Plan) {
                const plan = subscription.Plan;
                currentPlan = plan.name;
                console.log('Found subscription for tenant, plan name:', plan.name);
                features = {
                    analytics: plan.analyticsEnabled || false,
                    advanced_reports: plan.advancedReports || false,
                    custom_branding: plan.customBranding || false,
                    api_access: plan.apiAccess || false,
                    bulk_operations: plan.bulkOperations || false,
                    data_export: plan.dataExport || false,
                    custom_fields: plan.customFields || false,
                };
            }
            else {
                console.log('No active subscription found for tenant');
            }
            const usage = {
                users: { current: userCount, limit: subscription?.Plan?.maxUsers || 1 },
                products: { current: productCount, limit: subscription?.Plan?.maxProducts || 10 },
                branches: { current: branchCount, limit: subscription?.Plan?.maxBranches || 1 },
                sales: { current: salesCount, limit: subscription?.Plan?.maxSalesPerMonth || 100 },
            };
            if (subscription?.Plan?.name === 'Basic') {
                usage.branches.limit = Math.max(usage.branches.limit, 1);
                usage.users.limit = Math.max(usage.users.limit, 1);
            }
            return {
                currentPlan,
                usage,
                features,
            };
        }
        catch (error) {
            console.error('Error fetching plan limits:', error);
            return {
                currentPlan: 'Basic',
                usage: {
                    users: { current: 1, limit: 1 },
                    products: { current: 0, limit: 10 },
                    branches: { current: 1, limit: 1 },
                    sales: { current: 0, limit: 100 },
                },
                features: {
                    analytics: false,
                    advanced_reports: false,
                    custom_branding: false,
                    api_access: false,
                    bulk_operations: true,
                    data_export: false,
                    custom_fields: false,
                },
            };
        }
    }
};
exports.SubscriptionService = SubscriptionService;
exports.SubscriptionService = SubscriptionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        billing_service_1.BillingService])
], SubscriptionService);
//# sourceMappingURL=subscription.service.js.map