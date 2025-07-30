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
let BillingService = class BillingService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getPlans() {
        try {
            return await this.prisma.plan.findMany({
                where: { isActive: true },
                orderBy: { price: 'asc' },
            });
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
                },
                {
                    id: 'pro-plan',
                    name: 'Pro',
                    price: 29,
                    interval: 'monthly',
                    maxUsers: 25,
                    maxProducts: 500,
                    maxSalesPerMonth: 1000,
                    analyticsEnabled: true,
                    advancedReports: true,
                    prioritySupport: false,
                    customBranding: false,
                    apiAccess: false,
                    bulkOperations: true,
                    dataExport: true,
                    customFields: true,
                    advancedSecurity: false,
                    whiteLabel: false,
                    dedicatedSupport: false,
                    ssoEnabled: false,
                    auditLogs: false,
                    backupRestore: false,
                    customIntegrations: false,
                },
                {
                    id: 'enterprise-plan',
                    name: 'Enterprise',
                    price: 99,
                    interval: 'monthly',
                    maxUsers: 100,
                    maxProducts: 2000,
                    maxSalesPerMonth: 5000,
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
            ];
        }
    }
    async getCurrentSubscription(tenantId) {
        try {
            const subscription = await this.prisma.subscription.findFirst({
                where: {
                    tenantId,
                    status: 'active',
                },
                include: {
                    plan: true,
                },
            });
            if (!subscription) {
                return {
                    plan: { name: 'Basic', price: 0 },
                    status: 'none',
                    currentPeriodStart: null,
                    currentPeriodEnd: null,
                };
            }
            return {
                id: subscription.id,
                status: subscription.status,
                plan: subscription.plan,
                startDate: subscription.currentPeriodStart,
                endDate: subscription.currentPeriodEnd,
                cancelledAt: subscription.cancelledAt,
            };
        }
        catch (error) {
            console.error('Error fetching subscription:', error);
            return {
                plan: { name: 'Basic', price: 0 },
                status: 'none',
                currentPeriodStart: null,
                currentPeriodEnd: null,
            };
        }
    }
    async hasFeature(tenantId, feature) {
        const subscription = await this.prisma.subscription.findFirst({
            where: { tenantId },
            include: { plan: true },
            orderBy: { createdAt: 'desc' },
        });
        if (!subscription) {
            return false;
        }
        const plan = subscription.plan;
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
        const subscription = await this.prisma.subscription.findFirst({
            where: { tenantId },
            include: { plan: true },
            orderBy: { createdAt: 'desc' },
        });
        if (!subscription) {
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
        const plan = subscription.plan;
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
                        createdAt: { gte: startOfMonth }
                    }
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
            include: { plan: true },
            orderBy: { createdAt: 'desc' },
        });
        if (!subscription || subscription.plan.name !== 'Enterprise') {
            return null;
        }
        return {
            customBranding: {
                enabled: subscription.plan.customBranding,
                features: ['logo', 'colors', 'domain', 'white_label']
            },
            apiAccess: {
                enabled: subscription.plan.apiAccess,
                features: ['rest_api', 'webhooks', 'custom_integrations', 'rate_limits']
            },
            security: {
                enabled: subscription.plan.advancedSecurity,
                features: ['sso', 'audit_logs', 'backup_restore', 'encryption']
            },
            support: {
                enabled: subscription.plan.dedicatedSupport,
                features: ['24_7_support', 'dedicated_manager', 'priority_queue']
            }
        };
    }
    async getInvoices(tenantId) {
        try {
            const subscription = await this.prisma.subscription.findFirst({
                where: {
                    tenantId,
                    status: 'active',
                },
            });
            if (!subscription) {
                return [];
            }
            return await this.prisma.invoice.findMany({
                where: {
                    subscriptionId: subscription.id,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
        }
        catch (error) {
            console.error('Error fetching invoices:', error);
            return [];
        }
    }
};
exports.BillingService = BillingService;
exports.BillingService = BillingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BillingService);
//# sourceMappingURL=billing.service.js.map