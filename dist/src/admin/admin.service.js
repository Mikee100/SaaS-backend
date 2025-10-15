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
var AdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const billing_service_1 = require("../billing/billing.service");
const prisma_service_1 = require("../prisma.service");
const admin_tenant_stats_service_1 = require("../adminTenantStats/admin-tenant-stats.service");
const tenant_service_1 = require("../tenant/tenant.service");
let AdminService = AdminService_1 = class AdminService {
    billingService;
    prisma;
    adminTenantStatsService;
    tenantService;
    logger = new common_1.Logger(AdminService_1.name);
    constructor(billingService, prisma, adminTenantStatsService, tenantService) {
        this.billingService = billingService;
        this.prisma = prisma;
        this.adminTenantStatsService = adminTenantStatsService;
        this.tenantService = tenantService;
    }
    async getBillingMetrics() {
        return {
            mrr: 10000,
            activeSubscriptions: 50,
            trialSubscriptions: 5,
            delinquentRate: 2,
        };
    }
    async getAllSubscriptions() {
        return this.billingService.getAllTenantSubscriptions();
    }
    async getAllTenants() {
        this.logger.log('AdminService: getAllTenants called');
        const tenants = await this.prisma.tenant.findMany({
            include: {
                _count: {
                    select: {
                        users: true,
                        products: true,
                        Sale: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        this.logger.log(`AdminService: Found ${tenants.length} tenants`);
        const result = tenants.map(tenant => ({
            id: tenant.id,
            name: tenant.name,
            businessType: tenant.businessType,
            contactEmail: tenant.contactEmail,
            contactPhone: tenant.contactPhone,
            createdAt: tenant.createdAt,
            userCount: tenant._count.users,
            productCount: tenant._count.products,
            salesCount: tenant._count.Sale,
        }));
        this.logger.log(`AdminService: Returning ${result.length} tenants`);
        return result;
    }
    async getTenantById(tenantId) {
        this.logger.log(`AdminService: getTenantById called with tenantId: ${tenantId}`);
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });
        if (!tenant) {
            this.logger.error(`AdminService: Tenant not found for id: ${tenantId}`);
            throw new Error('Tenant not found');
        }
        this.logger.log(`AdminService: Found tenant: ${tenant.name}`);
        const [userCount, productCount, salesCount, branchCount] = await Promise.all([
            this.prisma.user.count({ where: { tenantId } }),
            this.prisma.product.count({ where: { tenantId } }),
            this.prisma.sale.count({ where: { tenantId } }),
            this.prisma.branch.count({ where: { tenantId } }),
        ]);
        this.logger.log(`AdminService: Counts for tenant ${tenantId}: users=${userCount}, products=${productCount}, sales=${salesCount}, branches=${branchCount}`);
        let totalBytes = 0;
        const resourceSpaceUsage = {};
        const tables = [
            { name: 'User', displayName: 'Users', query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "User" t WHERE "tenantId" = $1` },
            { name: 'Product', displayName: 'Products', query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "Product" t WHERE "tenantId" = $1` },
            { name: 'Inventory', displayName: 'Inventory', query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "Inventory" t WHERE "tenantId" = $1` },
            { name: 'Sale', displayName: 'Transactions', query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "Sale" t WHERE "tenantId" = $1` },
            { name: 'MpesaTransaction', displayName: 'M-Pesa Transactions', query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "MpesaTransaction" t WHERE "tenantId" = $1` },
            { name: 'Invoice', displayName: 'Invoices', query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "Invoice" t WHERE "tenantId" = $1` },
            { name: 'Payment', displayName: 'Payments', query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "Payment" t WHERE "tenantId" = $1` },
            { name: 'PaymentMethod', displayName: 'Payment Methods', query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "PaymentMethod" t WHERE "tenantId" = $1` },
            { name: 'Branch', displayName: 'Branches', query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "Branch" t WHERE "tenantId" = $1` },
            { name: 'Notification', displayName: 'Notifications', query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "Notification" t WHERE "tenantId" = $1` },
        ];
        for (const table of tables) {
            try {
                const rows = await this.prisma.$queryRawUnsafe(table.query, tenantId);
                const bytes = rows[0]?.bytes_used ? Number(rows[0].bytes_used) : 0;
                totalBytes += bytes;
                resourceSpaceUsage[table.displayName] = bytes;
            }
            catch (error) {
                this.logger.warn(`Failed to query table ${table.name} for tenant ${tenantId}: ${error.message}`);
                resourceSpaceUsage[table.displayName] = 0;
            }
        }
        const spaceUsedMB = (totalBytes / (1024 * 1024)).toFixed(2);
        this.logger.log(`AdminService: Space used for tenant ${tenantId}: ${spaceUsedMB} MB`);
        return {
            id: tenant.id,
            name: tenant.name,
            businessType: tenant.businessType,
            contactEmail: tenant.contactEmail,
            contactPhone: tenant.contactPhone,
            createdAt: tenant.createdAt,
            userCount,
            productCount,
            salesCount,
            branchCount,
            spaceUsedMB,
            resourceSpaceUsage,
        };
    }
    async getTenantProducts(tenantId) {
        this.logger.log(`AdminService: getTenantProducts called with tenantId: ${tenantId}`);
        const products = await this.prisma.product.findMany({
            where: { tenantId },
            include: {
                inventory: {
                    select: {
                        quantity: true,
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });
        this.logger.log(`AdminService: Found ${products.length} products for tenant ${tenantId}`);
        return products;
    }
    async getTenantTransactions(tenantId) {
        this.logger.log(`AdminService: getTenantTransactions called with tenantId: ${tenantId}`);
        const transactions = await this.prisma.sale.findMany({
            where: { tenantId },
            orderBy: {
                createdAt: 'desc',
            },
            take: 50,
        });
        this.logger.log(`AdminService: Found ${transactions.length} transactions for tenant ${tenantId}`);
        return transactions;
    }
    async switchToTenant(tenantId) {
        this.logger.log(`AdminService: switchToTenant called with tenantId: ${tenantId}`);
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });
        if (!tenant) {
            this.logger.error(`AdminService: Tenant not found for switch: ${tenantId}`);
            throw new Error('Tenant not found');
        }
        this.logger.log(`AdminService: Switching to tenant: ${tenant.name}`);
        return {
            tenantId: tenant.id,
            tenantName: tenant.name,
            switched: true,
        };
    }
    async getTenantsSpaceUsage() {
        this.logger.log('AdminService: getTenantsSpaceUsage called');
        return this.adminTenantStatsService.getAllTenantStats();
    }
    async getAllPlans() {
        this.logger.log('AdminService: getAllPlans called');
        const plans = await this.prisma.plan.findMany({
            include: {
                PlanFeatureOnPlan: {
                    include: {
                        PlanFeature: true,
                    },
                },
                _count: {
                    select: {
                        Subscription: true,
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });
        this.logger.log(`AdminService: Found ${plans.length} plans`);
        return plans.map(plan => ({
            id: plan.id,
            name: plan.name,
            description: plan.description,
            price: plan.price,
            interval: plan.interval,
            maxUsers: plan.maxUsers,
            maxProducts: plan.maxProducts,
            maxSalesPerMonth: plan.maxSalesPerMonth,
            maxBranches: plan.maxBranches,
            isActive: plan.isActive,
            stripePriceId: plan.stripePriceId,
            features: plan.PlanFeatureOnPlan
                .filter(pf => pf.isEnabled)
                .map(pf => ({
                id: pf.PlanFeature.id,
                key: pf.PlanFeature.featureKey,
                name: pf.PlanFeature.featureName,
                description: pf.PlanFeature.featureDescription,
                isEnabled: pf.isEnabled,
            })),
            subscriptionCount: plan._count.Subscription,
        }));
    }
    async getPlanById(planId) {
        this.logger.log(`AdminService: getPlanById called with planId: ${planId}`);
        const plan = await this.prisma.plan.findUnique({
            where: { id: planId },
            include: {
                PlanFeatureOnPlan: {
                    include: {
                        PlanFeature: true,
                    },
                },
                _count: {
                    select: {
                        Subscription: true,
                    },
                },
            },
        });
        if (!plan) {
            this.logger.error(`AdminService: Plan not found for id: ${planId}`);
            throw new Error('Plan not found');
        }
        this.logger.log(`AdminService: Found plan: ${plan.name}`);
        return {
            id: plan.id,
            name: plan.name,
            description: plan.description,
            price: plan.price,
            interval: plan.interval,
            maxUsers: plan.maxUsers,
            maxProducts: plan.maxProducts,
            maxSalesPerMonth: plan.maxSalesPerMonth,
            maxBranches: plan.maxBranches,
            isActive: plan.isActive,
            stripePriceId: plan.stripePriceId,
            features: plan.PlanFeatureOnPlan.map(pf => ({
                id: pf.PlanFeature.id,
                key: pf.PlanFeature.featureKey,
                name: pf.PlanFeature.featureName,
                description: pf.PlanFeature.featureDescription,
                isEnabled: pf.isEnabled,
            })),
            subscriptionCount: plan._count.Subscription,
        };
    }
    async createPlan(planData) {
        this.logger.log(`AdminService: createPlan called with name: ${planData.name}`);
        const plan = await this.prisma.plan.create({
            data: {
                name: planData.name,
                description: planData.description,
                price: planData.price,
                interval: planData.interval,
                maxUsers: planData.maxUsers,
                maxProducts: planData.maxProducts,
                maxSalesPerMonth: planData.maxSalesPerMonth,
                maxBranches: planData.maxBranches,
                isActive: planData.isActive ?? true,
                stripePriceId: planData.stripePriceId,
                PlanFeatureOnPlan: {
                    create: planData.featureIds.map(featureId => ({
                        PlanFeature: {
                            connect: { id: featureId },
                        },
                        isEnabled: true,
                    })),
                },
            },
            include: {
                PlanFeatureOnPlan: {
                    include: {
                        PlanFeature: true,
                    },
                },
            },
        });
        this.logger.log(`AdminService: Created plan: ${plan.name} with id: ${plan.id}`);
        return {
            id: plan.id,
            name: plan.name,
            description: plan.description,
            price: plan.price,
            interval: plan.interval,
            maxUsers: plan.maxUsers,
            maxProducts: plan.maxProducts,
            maxSalesPerMonth: plan.maxSalesPerMonth,
            maxBranches: plan.maxBranches,
            isActive: plan.isActive,
            stripePriceId: plan.stripePriceId,
            features: plan.PlanFeatureOnPlan.map(pf => ({
                id: pf.PlanFeature.id,
                key: pf.PlanFeature.featureKey,
                name: pf.PlanFeature.featureName,
                description: pf.PlanFeature.featureDescription,
                isEnabled: pf.isEnabled,
            })),
        };
    }
    async updatePlan(planId, planData) {
        this.logger.log(`AdminService: updatePlan called with planId: ${planId}`);
        const existingPlan = await this.prisma.plan.findUnique({
            where: { id: planId },
            include: {
                PlanFeatureOnPlan: true,
            },
        });
        if (!existingPlan) {
            this.logger.error(`AdminService: Plan not found for update: ${planId}`);
            throw new Error('Plan not found');
        }
        const updateData = {};
        if (planData.name !== undefined)
            updateData.name = planData.name;
        if (planData.description !== undefined)
            updateData.description = planData.description;
        if (planData.price !== undefined)
            updateData.price = planData.price;
        if (planData.interval !== undefined)
            updateData.interval = planData.interval;
        if (planData.maxUsers !== undefined)
            updateData.maxUsers = planData.maxUsers;
        if (planData.maxProducts !== undefined)
            updateData.maxProducts = planData.maxProducts;
        if (planData.maxSalesPerMonth !== undefined)
            updateData.maxSalesPerMonth = planData.maxSalesPerMonth;
        if (planData.maxBranches !== undefined)
            updateData.maxBranches = planData.maxBranches;
        if (planData.isActive !== undefined)
            updateData.isActive = planData.isActive;
        if (planData.stripePriceId !== undefined)
            updateData.stripePriceId = planData.stripePriceId;
        if (planData.featureIds !== undefined) {
            await this.prisma.planFeatureOnPlan.deleteMany({
                where: { planId },
            });
            updateData.PlanFeatureOnPlan = {
                create: planData.featureIds.map(featureId => ({
                    PlanFeature: {
                        connect: { id: featureId },
                    },
                    isEnabled: true,
                })),
            };
        }
        const plan = await this.prisma.plan.update({
            where: { id: planId },
            data: updateData,
            include: {
                PlanFeatureOnPlan: {
                    include: {
                        PlanFeature: true,
                    },
                },
                _count: {
                    select: {
                        Subscription: true,
                    },
                },
            },
        });
        this.logger.log(`AdminService: Updated plan: ${plan.name}`);
        return {
            id: plan.id,
            name: plan.name,
            description: plan.description,
            price: plan.price,
            interval: plan.interval,
            maxUsers: plan.maxUsers,
            maxProducts: plan.maxProducts,
            maxSalesPerMonth: plan.maxSalesPerMonth,
            maxBranches: plan.maxBranches,
            isActive: plan.isActive,
            stripePriceId: plan.stripePriceId,
            features: plan.PlanFeatureOnPlan.map(pf => ({
                id: pf.PlanFeature.id,
                key: pf.PlanFeature.featureKey,
                name: pf.PlanFeature.featureName,
                description: pf.PlanFeature.featureDescription,
                isEnabled: pf.isEnabled,
            })),
            subscriptionCount: plan._count.Subscription,
        };
    }
    async deletePlan(planId) {
        this.logger.log(`AdminService: deletePlan called with planId: ${planId}`);
        const subscriptionCount = await this.prisma.subscription.count({
            where: { planId },
        });
        if (subscriptionCount > 0) {
            this.logger.error(`AdminService: Cannot delete plan ${planId} - has ${subscriptionCount} active subscriptions`);
            throw new Error('Cannot delete plan with active subscriptions');
        }
        await this.prisma.planFeatureOnPlan.deleteMany({
            where: { planId },
        });
        await this.prisma.plan.delete({
            where: { id: planId },
        });
        this.logger.log(`AdminService: Deleted plan: ${planId}`);
        return { success: true, message: 'Plan deleted successfully' };
    }
    async getAllPlanFeatures() {
        this.logger.log('AdminService: getAllPlanFeatures called');
        const features = await this.prisma.planFeature.findMany({
            orderBy: {
                featureName: 'asc',
            },
        });
        this.logger.log(`AdminService: Found ${features.length} plan features`);
        return features;
    }
    async createTenant(tenantData) {
        this.logger.log(`AdminService: createTenant called for ${tenantData.name}`);
        const defaultPassword = 'owner1234@';
        const result = await this.tenantService.createTenantWithOwner({
            name: tenantData.name,
            businessType: tenantData.businessType,
            contactEmail: tenantData.contactEmail,
            contactPhone: tenantData.contactPhone,
            country: tenantData.country,
            branchName: 'Main Branch',
            owner: {
                name: tenantData.owner.name,
                email: tenantData.owner.email,
                password: defaultPassword,
            },
        });
        this.logger.log(`AdminService: Created tenant ${result.tenant.name} with id ${result.tenant.id}`);
        try {
            const emailService = new (require('../email/email.service').EmailService)();
            const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to SaaS Platform!</h2>
          <p>Your business account has been created successfully.</p>
          <p><strong>Business:</strong> ${result.tenant.name}</p>
          <p><strong>Email:</strong> ${result.user.email}</p>
          <p><strong>Temporary Password:</strong> ${defaultPassword}</p>
          <p>You can now log in to your account. We recommend changing your password after your first login for security.</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 16px 0;">Log In Now</a>
          <hr style="margin-top: 20px;">
          <p style="font-size: 12px; color: #666;">SaaS Platform - Business Management Solution</p>
        </div>
      `;
            await emailService.transporter.sendMail({
                from: process.env.FROM_EMAIL || '"SaaS Platform" <noreply@saasplatform.com>',
                to: result.user.email,
                subject: 'Welcome to SaaS Platform - Your Account is Ready',
                html,
            });
            this.logger.log(`Welcome email with credentials sent to ${result.user.email}`);
        }
        catch (error) {
            this.logger.error(`Failed to send welcome email to ${result.user.email}:`, error);
        }
        return {
            ...result,
            defaultPassword,
        };
    }
    async getAllUsers() {
        this.logger.log('AdminService: getAllUsers called');
        const users = await this.prisma.user.findMany({
            include: {
                tenant: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                userRoles: {
                    include: {
                        role: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        this.logger.log(`AdminService: Found ${users.length} users`);
        return users.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            isSuperadmin: user.isSuperadmin,
            isDisabled: user.isDisabled,
            createdAt: user.createdAt,
            tenant: user.tenant,
            userRoles: user.userRoles,
        }));
    }
    async updateUserStatus(userId, isDisabled) {
        this.logger.log(`AdminService: updateUserStatus called for userId: ${userId}, isDisabled: ${isDisabled}`);
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            this.logger.error(`AdminService: User not found for id: ${userId}`);
            throw new Error('User not found');
        }
        await this.prisma.user.update({
            where: { id: userId },
            data: { isDisabled },
        });
        this.logger.log(`AdminService: Updated user status for ${user.email} to ${isDisabled ? 'disabled' : 'enabled'}`);
        return {
            id: userId,
            email: user.email,
            isDisabled,
            message: `User account has been ${isDisabled ? 'disabled' : 'enabled'}.`,
        };
    }
    async deleteTenant(tenantId) {
        this.logger.log(`AdminService: deleteTenant called with tenantId: ${tenantId}`);
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });
        if (!tenant) {
            this.logger.error(`AdminService: Tenant not found for deletion: ${tenantId}`);
            throw new Error('Tenant not found');
        }
        this.logger.log(`AdminService: Deleting tenant: ${tenant.name} (${tenantId})`);
        await this.prisma.$transaction(async (prisma) => {
            await prisma.saleItem.deleteMany({
                where: { sale: { tenantId } },
            });
            await prisma.sale.deleteMany({
                where: { tenantId },
            });
            await prisma.inventoryMovement.deleteMany({
                where: { tenantId },
            });
            await prisma.inventoryAlert.deleteMany({
                where: { tenantId },
            });
            await prisma.inventory.deleteMany({
                where: { tenantId },
            });
            await prisma.inventoryLocation.deleteMany({
                where: { tenantId },
            });
            await prisma.productAdditionRecord.deleteMany({
                where: { tenantId },
            });
            await prisma.product.deleteMany({
                where: { tenantId },
            });
            await prisma.bulkUploadRecord.deleteMany({
                where: { tenantId },
            });
            await prisma.supplier.deleteMany({
                where: { tenantId },
            });
            await prisma.mpesaTransaction.deleteMany({
                where: { tenantId },
            });
            await prisma.notification.deleteMany({
                where: { tenantId },
            });
            await prisma.paymentMethod.deleteMany({
                where: { tenantId },
            });
            await prisma.payment.deleteMany({
                where: { tenantId },
            });
            await prisma.invoice.deleteMany({
                where: { tenantId },
            });
            await prisma.subscription.deleteMany({
                where: { tenantId },
            });
            await prisma.aIChatInteraction.deleteMany({
                where: { tenantId },
            });
            await prisma.auditLog.deleteMany({
                where: { User: { tenantId } },
            });
            await prisma.userPermission.deleteMany({
                where: { tenantId },
            });
            await prisma.userRole.deleteMany({
                where: { tenantId },
            });
            await prisma.userBranchRole.deleteMany({
                where: { tenantId },
            });
            await prisma.role.deleteMany({
                where: { tenantId },
            });
            await prisma.branch.deleteMany({
                where: { tenantId },
            });
            await prisma.user.deleteMany({
                where: { tenantId },
            });
            await prisma.tenantModule.deleteMany({
                where: { tenantId },
            });
            await prisma.tenant.delete({
                where: { id: tenantId },
            });
        });
        this.logger.log(`AdminService: Successfully deleted tenant: ${tenant.name} (${tenantId})`);
        return { success: true, message: 'Tenant deleted successfully' };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = AdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [billing_service_1.BillingService,
        prisma_service_1.PrismaService,
        admin_tenant_stats_service_1.AdminTenantStatsService,
        tenant_service_1.TenantService])
], AdminService);
//# sourceMappingURL=admin.service.js.map