import { Injectable, Logger } from '@nestjs/common';
import { BillingService } from '../billing/billing.service';
import { PrismaService } from '../prisma.service';
import { AdminTenantStatsService } from '../adminTenantStats/admin-tenant-stats.service';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly billingService: BillingService,
    private readonly prisma: PrismaService,
    private readonly adminTenantStatsService: AdminTenantStatsService,
    private readonly tenantService: TenantService,
  ) {}

  async getBillingMetrics() {
    // Implement logic to aggregate billing metrics from BillingService
    // For now, return dummy data or call billingService methods
    return {
      mrr: 10000,
      activeSubscriptions: 50,
      trialSubscriptions: 5,
      delinquentRate: 2,
    };
  }

  async getAllSubscriptions() {
    // Delegate to billingService to get all tenant subscriptions
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

    const result = tenants.map((tenant) => ({
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

  async getTenantById(tenantId: string) {
    this.logger.log(
      `AdminService: getTenantById called with tenantId: ${tenantId}`,
    );

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      this.logger.error(`AdminService: Tenant not found for id: ${tenantId}`);
      throw new Error('Tenant not found');
    }

    this.logger.log(`AdminService: Found tenant: ${tenant.name}`);

    // Get counts separately
    const [userCount, productCount, salesCount, branchCount] =
      await Promise.all([
        this.prisma.user.count({ where: { tenantId } }),
        this.prisma.product.count({ where: { tenantId } }),
        this.prisma.sale.count({ where: { tenantId } }),
        this.prisma.branch.count({ where: { tenantId } }),
      ]);

    this.logger.log(
      `AdminService: Counts for tenant ${tenantId}: users=${userCount}, products=${productCount}, sales=${salesCount}, branches=${branchCount}`,
    );

    // Calculate space used for this tenant
    let totalBytes = 0;
    const resourceSpaceUsage: Record<string, number> = {};

    // Query each table individually, with error handling for missing tables
    const tables = [
      {
        name: 'User',
        displayName: 'Users',
        query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "User" t WHERE "tenantId" = $1`,
      },
      {
        name: 'Product',
        displayName: 'Products',
        query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "Product" t WHERE "tenantId" = $1`,
      },
      {
        name: 'Inventory',
        displayName: 'Inventory',
        query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "Inventory" t WHERE "tenantId" = $1`,
      },
      {
        name: 'Sale',
        displayName: 'Transactions',
        query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "Sale" t WHERE "tenantId" = $1`,
      },
      {
        name: 'MpesaTransaction',
        displayName: 'M-Pesa Transactions',
        query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "MpesaTransaction" t WHERE "tenantId" = $1`,
      },
      {
        name: 'Invoice',
        displayName: 'Invoices',
        query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "Invoice" t WHERE "tenantId" = $1`,
      },
      {
        name: 'Payment',
        displayName: 'Payments',
        query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "Payment" t WHERE "tenantId" = $1`,
      },
      {
        name: 'PaymentMethod',
        displayName: 'Payment Methods',
        query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "PaymentMethod" t WHERE "tenantId" = $1`,
      },
      {
        name: 'Branch',
        displayName: 'Branches',
        query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "Branch" t WHERE "tenantId" = $1`,
      },
      {
        name: 'Notification',
        displayName: 'Notifications',
        query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "Notification" t WHERE "tenantId" = $1`,
      },
    ];

    for (const table of tables) {
      try {
        const rows: any = await this.prisma.$queryRawUnsafe(
          table.query,
          tenantId,
        );
        const bytes = rows[0]?.bytes_used ? Number(rows[0].bytes_used) : 0;
        totalBytes += bytes;
        resourceSpaceUsage[table.displayName] = bytes;
      } catch (error) {
        this.logger.warn(
          `Failed to query table ${table.name} for tenant ${tenantId}: ${error.message}`,
        );
        resourceSpaceUsage[table.displayName] = 0;
        // Skip this table if it doesn't exist or query fails
      }
    }

    const spaceUsedMB = (totalBytes / (1024 * 1024)).toFixed(2);

    this.logger.log(
      `AdminService: Space used for tenant ${tenantId}: ${spaceUsedMB} MB`,
    );

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

  async getTenantProducts(tenantId: string) {
    this.logger.log(
      `AdminService: getTenantProducts called with tenantId: ${tenantId}`,
    );

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

    this.logger.log(
      `AdminService: Found ${products.length} products for tenant ${tenantId}`,
    );
    return products;
  }

  async getTenantTransactions(tenantId: string) {
    this.logger.log(
      `AdminService: getTenantTransactions called with tenantId: ${tenantId}`,
    );

    const transactions = await this.prisma.sale.findMany({
      where: { tenantId },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to recent 50 transactions
    });

    this.logger.log(
      `AdminService: Found ${transactions.length} transactions for tenant ${tenantId}`,
    );
    return transactions;
  }

  async switchToTenant(tenantId: string) {
    this.logger.log(
      `AdminService: switchToTenant called with tenantId: ${tenantId}`,
    );

    // Verify tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      this.logger.error(
        `AdminService: Tenant not found for switch: ${tenantId}`,
      );
      throw new Error('Tenant not found');
    }

    this.logger.log(`AdminService: Switching to tenant: ${tenant.name}`);

    // Return tenant context info for frontend to handle switching
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

  // Plan Management Methods
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

    return plans.map((plan) => ({
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
      features: plan.PlanFeatureOnPlan.filter((pf) => pf.isEnabled).map(
        (pf) => ({
          id: pf.PlanFeature.id,
          key: pf.PlanFeature.featureKey,
          name: pf.PlanFeature.featureName,
          description: pf.PlanFeature.featureDescription,
          isEnabled: pf.isEnabled,
        }),
      ),
      subscriptionCount: plan._count.Subscription,
    }));
  }

  async getPlanById(planId: string) {
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
      features: (plan as any).PlanFeatureOnPlan.map((pf) => ({
        id: pf.PlanFeature.id,
        key: pf.PlanFeature.featureKey,
        name: pf.PlanFeature.featureName,
        description: pf.PlanFeature.featureDescription,
        isEnabled: pf.isEnabled,
      })),
      subscriptionCount: plan._count.Subscription,
    };
  }

  async createPlan(planData: {
    name: string;
    description: string;
    price: number;
    interval: string;
    maxUsers?: number;
    maxProducts?: number;
    maxSalesPerMonth?: number;
    maxBranches?: number;
    isActive?: boolean;
    stripePriceId?: string;
    featureIds: string[];
  }) {
    this.logger.log(
      `AdminService: createPlan called with name: ${planData.name}`,
    );

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
          create: planData.featureIds.map(
            (featureId) =>
              ({
                PlanFeature: {
                  connect: { id: featureId },
                },
                isEnabled: true,
              }) as any,
          ),
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

    this.logger.log(
      `AdminService: Created plan: ${plan.name} with id: ${plan.id}`,
    );

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
      features: plan.PlanFeatureOnPlan.map((pf) => ({
        id: pf.PlanFeature.id,
        key: pf.PlanFeature.featureKey,
        name: pf.PlanFeature.featureName,
        description: pf.PlanFeature.featureDescription,
        isEnabled: pf.isEnabled,
      })),
    };
  }

  async updatePlan(
    planId: string,
    planData: {
      name?: string;
      description?: string;
      price?: number;
      interval?: string;
      maxUsers?: number;
      maxProducts?: number;
      maxSalesPerMonth?: number;
      maxBranches?: number;
      isActive?: boolean;
      stripePriceId?: string;
      featureIds?: string[];
    },
  ) {
    this.logger.log(`AdminService: updatePlan called with planId: ${planId}`);

    // First, get the current plan to check if it exists
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

    // Update the plan
    const updateData: any = {};
    if (planData.name !== undefined) updateData.name = planData.name;
    if (planData.description !== undefined)
      updateData.description = planData.description;
    if (planData.price !== undefined) updateData.price = planData.price;
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

    // Handle feature updates if provided
    if (planData.featureIds !== undefined) {
      // Remove existing features
      await this.prisma.planFeatureOnPlan.deleteMany({
        where: { planId },
      });

      // Add new features
      updateData.PlanFeatureOnPlan = {
        create: planData.featureIds.map((featureId) => ({
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
      features: (plan as any).PlanFeatureOnPlan.map((pf) => ({
        id: pf.PlanFeature.id,
        key: pf.PlanFeature.featureKey,
        name: pf.PlanFeature.featureName,
        description: pf.PlanFeature.featureDescription,
        isEnabled: pf.isEnabled,
      })),
      subscriptionCount: plan._count.Subscription,
    };
  }

  async deletePlan(planId: string) {
    this.logger.log(`AdminService: deletePlan called with planId: ${planId}`);

    // Check if plan has active subscriptions
    const subscriptionCount = await this.prisma.subscription.count({
      where: { planId },
    });

    if (subscriptionCount > 0) {
      this.logger.error(
        `AdminService: Cannot delete plan ${planId} - has ${subscriptionCount} active subscriptions`,
      );
      throw new Error('Cannot delete plan with active subscriptions');
    }

    // Delete plan features first
    await this.prisma.planFeatureOnPlan.deleteMany({
      where: { planId },
    });

    // Delete the plan
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

  async createTenant(tenantData: {
    name: string;
    businessType: string;
    contactEmail: string;
    contactPhone?: string;
    country?: string;
    owner?: {
      name: string;
      email: string;
      password?: string;
    };
    // Support flat owner format from frontend
    ownerName?: string;
    ownerEmail?: string;
    ownerPassword?: string;
    [key: string]: any;
  }) {
    this.logger.log(`AdminService: createTenant called for ${tenantData.name || 'unknown'}`);
    this.logger.debug(`AdminService: Received tenant data: ${JSON.stringify(tenantData)}`);

    // Normalize owner data - handle both nested and flat formats
    let ownerName: string | undefined;
    let ownerEmail: string | undefined;

    if (tenantData.owner) {
      // Nested format: { owner: { name, email } }
      ownerName = tenantData.owner.name;
      ownerEmail = tenantData.owner.email;
    } else if (tenantData.ownerName && tenantData.ownerEmail) {
      // Flat format: { ownerName, ownerEmail }
      ownerName = tenantData.ownerName;
      ownerEmail = tenantData.ownerEmail;
    }

    // Validate required fields with specific error messages
    const missingFields: string[] = [];
    if (!tenantData.name) missingFields.push('name');
    if (!tenantData.businessType) missingFields.push('businessType');
    if (!tenantData.contactEmail) missingFields.push('contactEmail');
    if (!ownerName) missingFields.push('owner.name or ownerName');
    if (!ownerEmail) missingFields.push('owner.email or ownerEmail');

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // At this point, ownerName and ownerEmail are guaranteed to be strings
    // TypeScript doesn't know this, so we use non-null assertions
    const validatedOwnerName: string = ownerName!;
    const validatedOwnerEmail: string = ownerEmail!;

    // Use default country if not provided
    const country = tenantData.country || 'Unknown';

    // Generate a default password for the owner
    const defaultPassword = 'owner1234@';

    const result = await this.tenantService.createTenantWithOwner({
      name: tenantData.name,
      businessType: tenantData.businessType,
      contactEmail: tenantData.contactEmail,
      contactPhone: tenantData.contactPhone,
      country: country,
      branchName: 'Main Branch',
      owner: {
        name: validatedOwnerName,
        email: validatedOwnerEmail,
        password: defaultPassword, // Use default password instead of provided one
      },
    });

    this.logger.log(
      `AdminService: Created tenant ${result.tenant.name} with id ${result.tenant.id}`,
    );

    // Send welcome email with login credentials
    try {
      const emailService =
        new (require('../email/email.service').EmailService)();

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
        from:
          process.env.FROM_EMAIL ||
          '"SaaS Platform" <noreply@saasplatform.com>',
        to: result.user.email,
        subject: 'Welcome to SaaS Platform - Your Account is Ready',
        html,
      });

      this.logger.log(
        `Welcome email with credentials sent to ${result.user.email}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email to ${result.user.email}:`,
        error,
      );
      // Don't fail the tenant creation if email fails
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

    return users.map((user) => ({
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

  async updateUserRole(userId: string, roleId: string, tenantId?: string) {
    this.logger.log(`AdminService: updateUserRole called for userId: ${userId}, roleId: ${roleId}`);

    // Find the user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Find the role
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    // Determine tenantId - use provided one or user's tenant
    const targetTenantId = tenantId || user.tenantId;

    if (!targetTenantId) {
      throw new Error('Tenant ID is required for role assignment');
    }

    // Remove existing user roles for this tenant
    await this.prisma.userRole.deleteMany({
      where: {
        userId: userId,
        tenantId: targetTenantId,
      },
    });

    // Create new user role
    const userRole = await this.prisma.userRole.create({
      data: {
        userId: userId,
        roleId: roleId,
        tenantId: targetTenantId,
      },
      include: {
        role: true,
        user: true,
      },
    });

    // Log the role change
    if (this.adminTenantStatsService) {
      // Assuming audit log service is available
      // await this.auditLogService.log(userId, 'role_changed', { oldRole: oldRole?.name, newRole: role.name }, null);
    }

    this.logger.log(`AdminService: Successfully updated role for user ${userId} to ${role.name}`);
    return userRole;
  }

  async getUserActivity(userId: string, limit: number = 50) {
    this.logger.log(`AdminService: getUserActivity called for userId: ${userId}`);

    const activities = await this.prisma.loginHistory.findMany({
      where: { userId: userId },
      orderBy: { loginTime: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    this.logger.log(`AdminService: Found ${activities.length} login records for user ${userId}`);
    return activities;
  }

  async updateUserStatus(userId: string, isDisabled: boolean) {
    this.logger.log(
      `AdminService: updateUserStatus called for userId: ${userId}, isDisabled: ${isDisabled}`,
    );

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

    // Log the action (assuming audit log is handled elsewhere or add if needed)
    this.logger.log(
      `AdminService: Updated user status for ${user.email} to ${isDisabled ? 'disabled' : 'enabled'}`,
    );

    return {
      id: userId,
      email: user.email,
      isDisabled,
      message: `User account has been ${isDisabled ? 'disabled' : 'enabled'}.`,
    };
  }

  async deleteTenant(tenantId: string) {
    this.logger.log(
      `AdminService: deleteTenant called with tenantId: ${tenantId}`,
    );

    // Verify tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      this.logger.error(
        `AdminService: Tenant not found for deletion: ${tenantId}`,
      );
      throw new Error('Tenant not found');
    }

    this.logger.log(
      `AdminService: Deleting tenant: ${tenant.name} (${tenantId})`,
    );

    // Use transaction to delete all related data in proper order
    await this.prisma.$transaction(async (prisma) => {
      // Delete in order to respect foreign key constraints
      // Start with leaf entities and work up to the tenant

      // 1. Delete SaleItem (depends on Sale)
      await prisma.saleItem.deleteMany({
        where: { sale: { tenantId } },
      });

      // 2. Delete Sale (depends on User, Branch, Tenant)
      await prisma.sale.deleteMany({
        where: { tenantId },
      });

      // 3. Delete InventoryMovement (depends on Product, Branch)
      await prisma.inventoryMovement.deleteMany({
        where: { tenantId },
      });

      // 4. Delete InventoryAlert (depends on Product, Branch)
      await prisma.inventoryAlert.deleteMany({
        where: { tenantId },
      });

      // 5. Delete Inventory (depends on Product, Branch)
      await prisma.inventory.deleteMany({
        where: { tenantId },
      });

      // 6. Delete InventoryLocation (depends on Branch)
      await prisma.inventoryLocation.deleteMany({
        where: { tenantId },
      });

      // 7. Delete ProductAdditionRecord (depends on Product, Branch, User)
      await prisma.productAdditionRecord.deleteMany({
        where: { tenantId },
      });

      // 8. Delete Product (depends on Branch, Supplier, Tenant)
      await prisma.product.deleteMany({
        where: { tenantId },
      });

      // 9. Delete BulkUploadRecord (depends on Branch, Supplier, User)
      await prisma.bulkUploadRecord.deleteMany({
        where: { tenantId },
      });

      // 10. Delete Supplier (depends on Tenant)
      await prisma.supplier.deleteMany({
        where: { tenantId },
      });

      // 11. Delete MpesaTransaction (depends on User, Sale, Tenant)
      await prisma.mpesaTransaction.deleteMany({
        where: { tenantId },
      });

      // 12. Delete Notification (depends on User, Tenant)
      await prisma.notification.deleteMany({
        where: { tenantId },
      });

      // 13. Delete PaymentMethod (depends on Tenant)
      await prisma.paymentMethod.deleteMany({
        where: { tenantId },
      });

      // 14. Delete Payment (depends on Tenant)
      await prisma.payment.deleteMany({
        where: { tenantId },
      });

      // 15. Delete Invoice (depends on Subscription, Tenant)
      await prisma.invoice.deleteMany({
        where: { tenantId },
      });

      // 16. Delete Subscription (depends on Plan, User, Tenant)
      await prisma.subscription.deleteMany({
        where: { tenantId },
      });

      // 17. Delete AIChatInteraction (depends on User, Branch, Tenant)
      await prisma.aIChatInteraction.deleteMany({
        where: { tenantId },
      });

      // 18. Delete AuditLog (depends on User)
      await prisma.auditLog.deleteMany({
        where: { User: { tenantId } },
      });

      // 19. Delete UserPermission (depends on User, Tenant)
      await prisma.userPermission.deleteMany({
        where: { tenantId },
      });

      // 20. Delete UserRole (depends on User, Role, Tenant)
      await prisma.userRole.deleteMany({
        where: { tenantId },
      });

      // 21. Delete UserBranchRole (depends on User, Branch, Role, Tenant)
      await prisma.userBranchRole.deleteMany({
        where: { tenantId },
      });

      // 21.5. Delete RolePermission (depends on Role)
      await prisma.rolePermission.deleteMany({
        where: { role: { tenantId } },
      });

      // 22. Delete Role (depends on Tenant)
      await prisma.role.deleteMany({
        where: { tenantId },
      });

      // 23. Delete Branch (depends on Tenant)
      await prisma.branch.deleteMany({
        where: { tenantId },
      });

      // 24. Delete User (depends on Branch, Tenant)
      await prisma.user.deleteMany({
        where: { tenantId },
      });

      // 25. Delete TenantModule (depends on Tenant, Module)
      await prisma.tenantModule.deleteMany({
        where: { tenantId },
      });

      // 26. Finally, delete the Tenant itself
      await prisma.tenant.delete({
        where: { id: tenantId },
      });
    });

    this.logger.log(
      `AdminService: Successfully deleted tenant: ${tenant.name} (${tenantId})`,
    );

    return { success: true, message: 'Tenant deleted successfully' };
  }
}
