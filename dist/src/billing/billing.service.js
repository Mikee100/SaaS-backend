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
exports.BillingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const common_2 = require("@nestjs/common");
let BillingService = class BillingService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAllTenantSubscriptions() {
        const tenants = await this.prisma.tenant.findMany({
            include: {
                Subscription: {
                    include: {
                        Plan: true,
                    },
                    orderBy: { currentPeriodStart: 'desc' },
                },
            },
        });
        return Promise.all(tenants.map(async (tenant) => {
            const sub = tenant.Subscription?.[0];
            const lastInvoice = sub
                ? await this.prisma.invoice.findFirst({
                    where: { subscriptionId: sub.id },
                    orderBy: { createdAt: 'desc' },
                })
                : null;
            const lastPayment = await this.prisma.payment.findFirst({
                where: { tenantId: tenant.id },
                orderBy: { createdAt: 'desc' },
            });
            return {
                tenantId: tenant.id,
                clientName: tenant.name,
                clientEmail: tenant.contactEmail,
                plan: sub?.Plan
                    ? {
                        name: sub.Plan.name,
                        price: sub.Plan.price,
                        interval: sub.Plan.interval,
                        features: {
                            maxUsers: sub.Plan.maxUsers,
                            maxProducts: sub.Plan.maxProducts,
                            maxSalesPerMonth: sub.Plan.maxSalesPerMonth,
                            analyticsEnabled: sub.Plan.analyticsEnabled,
                            advancedReports: sub.Plan.advancedReports,
                            prioritySupport: sub.Plan.prioritySupport,
                            customBranding: sub.Plan.customBranding,
                            apiAccess: sub.Plan.apiAccess,
                        },
                    }
                    : null,
                status: sub?.status || 'none',
                startDate: sub?.currentPeriodStart,
                currentPeriodEnd: sub?.currentPeriodEnd,
                cancelAtPeriodEnd: sub?.cancelAtPeriodEnd || false,
                lastInvoice: lastInvoice
                    ? {
                        id: lastInvoice.id,
                        amount: lastInvoice.amount,
                        status: lastInvoice.status,
                        dueDate: lastInvoice.dueDate,
                        paidAt: lastInvoice.paidAt,
                    }
                    : null,
                lastPayment: lastPayment
                    ? {
                        id: lastPayment.id,
                        amount: lastPayment.amount,
                        currency: lastPayment.currency,
                        status: lastPayment.status,
                        completedAt: lastPayment.completedAt,
                    }
                    : null,
            };
        }));
    }
    async getPlans() {
        try {
            const plans = await this.prisma.plan.findMany({
                where: { isActive: true },
                orderBy: { price: 'asc' },
                include: {
                    PlanFeatureOnPlan: {
                        include: {
                            PlanFeature: true,
                        },
                        where: { isEnabled: true },
                    },
                },
            });
            return plans.map((plan) => ({
                ...plan,
                features: plan.PlanFeatureOnPlan?.map((f) => f.PlanFeature?.featureName).filter((featureName) => Boolean(featureName)) || [],
            }));
        }
        catch (error) {
            console.error('Error fetching plans:', error);
            return [
                {
                    id: 'basic-plan',
                    name: 'Basic',
                    price: 0,
                    interval: 'monthly',
                    maxUsers: 5,
                    maxProducts: 50,
                    maxSalesPerMonth: 100,
                    features: ['Basic Usage'],
                },
                {
                    id: 'pro-plan',
                    name: 'Pro',
                    price: 29,
                    interval: 'monthly',
                    maxUsers: 25,
                    maxProducts: 500,
                    maxSalesPerMonth: 1000,
                    features: ['Advanced Analytics', 'Data Export'],
                },
                {
                    id: 'enterprise-plan',
                    name: 'Enterprise',
                    price: 99,
                    interval: 'monthly',
                    maxUsers: null,
                    maxProducts: null,
                    maxSalesPerMonth: null,
                    features: ['All Features'],
                },
            ];
        }
    }
    async getCurrentSubscription(tenantId) {
        try {
            const subscription = await this.prisma.subscription.findFirst({
                where: {
                    tenantId,
                    status: { in: ['active', 'past_due', 'trialing'] },
                },
                include: {
                    Plan: true,
                },
                orderBy: {
                    currentPeriodStart: 'desc',
                },
            });
            if (!subscription || !subscription.Plan) {
                return {
                    plan: { name: 'Basic', price: 0, id: 'free-tier' },
                    status: 'none',
                    currentPeriodStart: null,
                    currentPeriodEnd: null,
                    cancelAtPeriodEnd: false,
                };
            }
            return {
                ...subscription,
                plan: subscription.Plan,
            };
        }
        catch (error) {
            console.error('Error getting current subscription:', error);
            return {
                plan: { name: 'Basic', price: 0, id: 'free-tier' },
                status: 'none',
                currentPeriodStart: null,
                currentPeriodEnd: null,
                cancelAtPeriodEnd: false,
            };
        }
    }
    async hasFeature(tenantId, feature) {
        const subscription = await this.prisma.subscription.findFirst({
            where: { tenantId },
            include: {
                Plan: true,
            },
            orderBy: {
                currentPeriodStart: 'desc',
            },
        });
        if (!subscription || !subscription.Plan) {
            return false;
        }
        const plan = subscription.Plan;
        switch (feature) {
            case 'analytics':
                return plan.analyticsEnabled;
            case 'advanced_reports':
                return plan.advancedReports;
            case 'priority_support':
                return plan.prioritySupport;
            case 'custom_branding':
                return plan.customBranding;
            case 'api_access':
                return plan.apiAccess;
            case 'bulk_operations':
                return plan.bulkOperations || false;
            case 'data_export':
                return plan.dataExport || false;
            case 'custom_fields':
                return plan.customFields || false;
            case 'advanced_security':
                return plan.advancedSecurity || false;
            case 'white_label':
                return plan.whiteLabel || false;
            case 'dedicated_support':
                return plan.dedicatedSupport || false;
            case 'sso_enabled':
                return plan.ssoEnabled || false;
            case 'audit_logs':
                return plan.auditLogs || false;
            case 'backup_restore':
                return plan.backupRestore || false;
            case 'custom_integrations':
                return plan.customIntegrations || false;
            case 'enterprise_branding':
                return plan.customBranding && plan.whiteLabel;
            case 'full_api_access':
                return plan.apiAccess && plan.customIntegrations;
            case 'advanced_analytics':
                return plan.analyticsEnabled && plan.advancedReports;
            case 'security_audit':
                return plan.advancedSecurity && plan.auditLogs;
            default:
                return false;
        }
    }
    async getPlanLimits(tenantId) {
        try {
            const subscription = await this.prisma.subscription.findFirst({
                where: { tenantId },
                include: {
                    Plan: true,
                },
                orderBy: {
                    currentPeriodStart: 'desc',
                },
            });
            if (!subscription || !subscription.Plan) {
                return {
                    maxUsers: 3,
                    maxProducts: 100,
                    maxSalesPerMonth: 200,
                    analyticsEnabled: false,
                    advancedReports: false,
                    prioritySupport: false,
                    customBranding: false,
                    apiAccess: false,
                    bulkOperations: false,
                    dataExport: false,
                    customFields: false,
                    advancedSecurity: false,
                    whiteLabel: false,
                    dedicatedSupport: false,
                    ssoEnabled: false,
                    auditLogs: false,
                    backupRestore: false,
                    customIntegrations: false,
                };
            }
            const plan = subscription.Plan;
            return {
                maxUsers: plan.maxUsers,
                maxProducts: plan.maxProducts,
                maxSalesPerMonth: plan.maxSalesPerMonth,
                analyticsEnabled: plan.analyticsEnabled,
                advancedReports: plan.advancedReports,
                prioritySupport: plan.prioritySupport,
                customBranding: plan.customBranding,
                apiAccess: plan.apiAccess,
                bulkOperations: plan.bulkOperations || false,
                dataExport: plan.dataExport || false,
                customFields: plan.customFields || false,
                advancedSecurity: plan.advancedSecurity || false,
                whiteLabel: plan.whiteLabel || false,
                dedicatedSupport: plan.dedicatedSupport || false,
                ssoEnabled: plan.ssoEnabled || false,
                auditLogs: plan.auditLogs || false,
                backupRestore: plan.backupRestore || false,
                customIntegrations: plan.customIntegrations || false,
            };
        }
        catch (error) {
            throw error;
        }
    }
    async checkLimit(tenantId, limitType) {
        const limits = await this.getPlanLimits(tenantId);
        let current = 0;
        let limit = 0;
        switch (limitType) {
            case 'users':
                current = await this.prisma.userRole.count({ where: { tenantId } });
                limit = limits.maxUsers || 3;
                break;
            case 'products':
                current = await this.prisma.product.count({ where: { tenantId } });
                limit = limits.maxProducts || 100;
                break;
            case 'sales':
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                current = await this.prisma.sale.count({
                    where: {
                        tenantId,
                        createdAt: { gte: startOfMonth },
                    },
                });
                limit = limits.maxSalesPerMonth || 200;
                break;
        }
        return {
            allowed: limit === null || current < limit,
            current,
            limit: limit === null ? Infinity : limit,
        };
    }
    async getEnterpriseFeatures(tenantId) {
        const subscription = await this.prisma.subscription.findFirst({
            where: { tenantId },
            include: {
                Plan: true,
            },
            orderBy: {
                currentPeriodStart: 'desc',
            },
        });
        if (!subscription ||
            !subscription.Plan ||
            subscription.Plan.name !== 'Enterprise') {
            return null;
        }
        return {
            customBranding: {
                enabled: subscription.Plan.customBranding,
                features: ['logo', 'colors', 'domain', 'white_label'],
            },
            apiAccess: {
                enabled: subscription.Plan.apiAccess,
                features: [
                    'rest_api',
                    'webhooks',
                    'custom_integrations',
                    'rate_limits',
                ],
            },
            security: {
                enabled: subscription.Plan.advancedSecurity,
                features: ['sso', 'audit_logs', 'backup_restore', 'encryption'],
            },
            support: {
                enabled: subscription.Plan.dedicatedSupport,
                features: ['24_7_support', 'dedicated_manager', 'priority_queue'],
            },
        };
    }
    async getInvoices(tenantId) {
        try {
            const invoices = await this.prisma.invoice.findMany({
                where: {
                    tenantId,
                    status: { in: ['paid', 'open', 'void'] },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
            const invoicesWithDetails = await Promise.all(invoices.map(async (invoice) => {
                let subscriptionDetails = null;
                if (invoice.subscriptionId) {
                    const subscription = await this.prisma.subscription.findUnique({
                        where: { id: invoice.subscriptionId },
                        include: {
                            Plan: true,
                        },
                    });
                    if (subscription && subscription.Plan) {
                        subscriptionDetails = {
                            id: subscription.id,
                            plan: {
                                name: subscription.Plan.name,
                                price: subscription.Plan.price,
                            },
                        };
                    }
                }
                return {
                    id: invoice.id,
                    number: invoice.number,
                    amount: invoice.amount,
                    status: invoice.status,
                    dueDate: invoice.dueDate,
                    paidAt: invoice.paidAt,
                    createdAt: invoice.createdAt,
                    subscription: subscriptionDetails,
                };
            }));
            return invoicesWithDetails;
        }
        catch (error) {
            console.error('Error fetching invoices:', error);
            throw error;
        }
    }
    async getPlanFeatures(planId) {
        const plan = await this.prisma.plan.findUnique({
            where: { id: planId },
        });
        if (!plan) {
            throw new common_2.NotFoundException('Plan not found');
        }
        return {
            analyticsEnabled: plan.analyticsEnabled,
            advancedReports: plan.advancedReports,
            prioritySupport: plan.prioritySupport,
            customBranding: plan.customBranding,
            apiAccess: plan.apiAccess,
            bulkOperations: plan.bulkOperations,
            dataExport: plan.dataExport,
            customFields: plan.customFields,
            advancedSecurity: plan.advancedSecurity,
            whiteLabel: plan.whiteLabel,
            dedicatedSupport: plan.dedicatedSupport,
            ssoEnabled: plan.ssoEnabled,
            auditLogs: plan.auditLogs,
            backupRestore: plan.backupRestore,
            customIntegrations: plan.customIntegrations,
        };
    }
    async getSubscriptionFeatures(subscriptionId) {
        const subscription = await this.prisma.subscription.findUnique({
            where: { id: subscriptionId },
            include: {
                Plan: true,
            },
        });
        if (!subscription || !subscription.Plan) {
            throw new common_2.NotFoundException('Subscription or associated plan not found');
        }
        return {
            customBranding: subscription.Plan.customBranding,
            apiAccess: subscription.Plan.apiAccess,
            advancedSecurity: subscription.Plan.advancedSecurity,
            dedicatedSupport: subscription.Plan.dedicatedSupport,
        };
    }
    async getBillingMetrics() {
        const now = new Date();
        const activeSubscriptions = await this.prisma.subscription.count({
            where: {
                status: 'active',
            },
        });
        const trialSubscriptions = await this.prisma.subscription.count({
            where: {
                status: 'trialing',
            },
        });
        const delinquentSubscriptions = await this.prisma.subscription.count({
            where: {
                status: 'past_due',
            },
        });
        const activeSubsWithPlans = await this.prisma.subscription.findMany({
            where: {
                status: 'active',
            },
            include: {
                Plan: true,
            },
        });
        const mrr = activeSubsWithPlans.reduce((total, sub) => {
            if (sub.Plan) {
                const monthlyPrice = sub.Plan.interval === 'yearly'
                    ? sub.Plan.price / 12
                    : sub.Plan.price;
                return total + monthlyPrice;
            }
            return total;
        }, 0);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const paymentsThisMonth = await this.prisma.payment.findMany({
            where: {
                createdAt: { gte: startOfMonth },
                status: 'completed',
            },
        });
        const revenueThisMonth = paymentsThisMonth.reduce((total, payment) => {
            return total + payment.amount;
        }, 0);
        return {
            mrr: Math.round(mrr * 100) / 100,
            activeSubscriptions,
            trialSubscriptions,
            delinquentSubscriptions,
            revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
            totalSubscriptions: activeSubscriptions + trialSubscriptions + delinquentSubscriptions,
        };
    }
    async getAllSubscriptions(filters) {
        const { status, planId, tenantId, page = 1, limit = 50 } = filters || {};
        const where = {};
        if (status)
            where.status = status;
        if (planId)
            where.planId = planId;
        if (tenantId)
            where.tenantId = tenantId;
        const total = await this.prisma.subscription.count({ where });
        const subscriptions = await this.prisma.subscription.findMany({
            where,
            include: {
                Plan: true,
                Tenant: {
                    select: {
                        id: true,
                        name: true,
                        contactEmail: true,
                    },
                },
                ScheduledPlan: true,
            },
            orderBy: { currentPeriodStart: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return {
            subscriptions: subscriptions.map((sub) => ({
                id: sub.id,
                tenantId: sub.tenantId,
                tenantName: sub.Tenant?.name,
                tenantEmail: sub.Tenant?.contactEmail,
                plan: sub.Plan ? {
                    id: sub.Plan.id,
                    name: sub.Plan.name,
                    price: sub.Plan.price,
                    interval: sub.Plan.interval,
                } : null,
                status: sub.status,
                currentPeriodStart: sub.currentPeriodStart,
                currentPeriodEnd: sub.currentPeriodEnd,
                cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
                canceledAt: sub.canceledAt,
                scheduledPlan: sub.ScheduledPlan ? {
                    id: sub.ScheduledPlan.id,
                    name: sub.ScheduledPlan.name,
                    price: sub.ScheduledPlan.price,
                    effectiveDate: sub.scheduledEffectiveDate,
                } : null,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getSubscriptionAnalytics() {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const churnedSubscriptions = await this.prisma.subscription.count({
            where: {
                canceledAt: { gte: thirtyDaysAgo },
                status: 'cancelled',
            },
        });
        const activeAtStart = await this.prisma.subscription.count({
            where: {
                currentPeriodStart: { lt: thirtyDaysAgo },
                OR: [
                    { status: 'active' },
                    { canceledAt: { gte: thirtyDaysAgo } },
                ],
            },
        });
        const churnRate = activeAtStart > 0 ? (churnedSubscriptions / activeAtStart) * 100 : 0;
        const activeSubsWithPlans = await this.prisma.subscription.findMany({
            where: {
                status: 'active',
            },
            include: {
                Plan: true,
            },
        });
        const arr = activeSubsWithPlans.reduce((total, sub) => {
            if (sub.Plan) {
                const annualPrice = sub.Plan.interval === 'monthly'
                    ? sub.Plan.price * 12
                    : sub.Plan.price;
                return total + annualPrice;
            }
            return total;
        }, 0);
        const totalRevenue = await this.prisma.payment.aggregate({
            _sum: {
                amount: true,
            },
            where: {
                status: 'completed',
            },
        });
        const totalCustomers = await this.prisma.tenant.count({
            where: {
                Subscription: {
                    some: {
                        status: { in: ['active', 'cancelled'] },
                    },
                },
            },
        });
        const ltv = totalCustomers > 0 ? totalRevenue._sum.amount / totalCustomers : 0;
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const newSubscriptionsThisMonth = await this.prisma.subscription.count({
            where: {
                currentPeriodStart: { gte: startOfMonth },
            },
        });
        return {
            churnRate: Math.round(churnRate * 100) / 100,
            arr: Math.round(arr * 100) / 100,
            ltv: Math.round(ltv * 100) / 100,
            newSubscriptionsThisMonth,
            totalRevenue: totalRevenue._sum.amount || 0,
            totalCustomers,
        };
    }
};
exports.BillingService = BillingService;
exports.BillingService = BillingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BillingService);
//# sourceMappingURL=billing.service.js.map