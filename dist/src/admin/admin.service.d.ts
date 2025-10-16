import { BillingService } from '../billing/billing.service';
import { PrismaService } from '../prisma.service';
import { AdminTenantStatsService } from '../adminTenantStats/admin-tenant-stats.service';
import { TenantService } from '../tenant/tenant.service';
export declare class AdminService {
    private readonly billingService;
    private readonly prisma;
    private readonly adminTenantStatsService;
    private readonly tenantService;
    private readonly logger;
    constructor(billingService: BillingService, prisma: PrismaService, adminTenantStatsService: AdminTenantStatsService, tenantService: TenantService);
    getBillingMetrics(): Promise<{
        mrr: number;
        activeSubscriptions: number;
        trialSubscriptions: number;
        delinquentRate: number;
    }>;
    getAllSubscriptions(): Promise<{
        tenantId: string;
        clientName: string;
        clientEmail: string;
        plan: {
            name: string;
            price: number;
            interval: string;
            features: {
                maxUsers: number | null;
                maxProducts: number | null;
                maxSalesPerMonth: number | null;
                analyticsEnabled: boolean;
                advancedReports: boolean;
                prioritySupport: boolean;
                customBranding: boolean;
                apiAccess: boolean;
            };
        } | null;
        status: string;
        startDate: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        lastInvoice: {
            id: string;
            amount: number;
            status: string;
            dueDate: Date | null;
            paidAt: Date | null;
        } | null;
        lastPayment: {
            id: string;
            amount: number;
            currency: string;
            status: string;
            completedAt: Date | null;
        } | null;
    }[]>;
    getAllTenants(): Promise<{
        id: string;
        name: string;
        businessType: string;
        contactEmail: string;
        contactPhone: string | null;
        createdAt: Date;
        userCount: number;
        productCount: number;
        salesCount: number;
    }[]>;
    getTenantById(tenantId: string): Promise<{
        id: string;
        name: string;
        businessType: string;
        contactEmail: string;
        contactPhone: string | null;
        createdAt: Date;
        userCount: number;
        productCount: number;
        salesCount: number;
        branchCount: number;
        spaceUsedMB: string;
        resourceSpaceUsage: Record<string, number>;
    }>;
    getTenantProducts(tenantId: string): Promise<({
        inventory: {
            quantity: number;
        }[];
    } & {
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        price: number;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
        sku: string;
        stock: number;
        branchId: string | null;
        cost: number;
        images: string[];
        supplierId: string | null;
        bulkUploadRecordId: string | null;
    })[]>;
    getTenantTransactions(tenantId: string): Promise<{
        id: string;
        tenantId: string;
        userId: string;
        createdAt: Date;
        branchId: string | null;
        total: number;
        paymentType: string;
        customerName: string | null;
        customerPhone: string | null;
        mpesaTransactionId: string | null;
        idempotencyKey: string | null;
        vatAmount: number | null;
    }[]>;
    switchToTenant(tenantId: string): Promise<{
        tenantId: string;
        tenantName: string;
        switched: boolean;
    }>;
    getTenantsSpaceUsage(): Promise<{
        tenantId: string;
        spaceUsedMB: string;
        productCount: number;
        id: string;
        stripeCustomerId: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        backupRestore: boolean;
        customIntegrations: boolean;
        ssoEnabled: boolean;
        whiteLabel: boolean;
        businessType: string;
        contactEmail: string;
        contactPhone: string | null;
        address: string | null;
        currency: string | null;
        logoUrl: string | null;
        timezone: string | null;
        vatNumber: string | null;
        city: string | null;
        country: string | null;
        taxId: string | null;
        website: string | null;
        annualRevenue: string | null;
        apiKey: string | null;
        businessCategory: string | null;
        businessDescription: string | null;
        businessHours: import("@prisma/client/runtime/library").JsonValue | null;
        businessLicense: string | null;
        businessSubcategory: string | null;
        customDomain: string | null;
        employeeCount: string | null;
        etimsQrUrl: string | null;
        favicon: string | null;
        foundedYear: number | null;
        invoiceFooter: string | null;
        kraPin: string | null;
        latitude: number | null;
        longitude: number | null;
        postalCode: string | null;
        primaryColor: string | null;
        primaryProducts: import("@prisma/client/runtime/library").JsonValue | null;
        rateLimit: number | null;
        receiptLogo: string | null;
        secondaryColor: string | null;
        secondaryProducts: import("@prisma/client/runtime/library").JsonValue | null;
        socialMedia: import("@prisma/client/runtime/library").JsonValue | null;
        state: string | null;
        watermark: string | null;
        webhookUrl: string | null;
        dashboardLogoUrl: string | null;
        emailLogoUrl: string | null;
        loginLogoUrl: string | null;
        logoSettings: import("@prisma/client/runtime/library").JsonValue | null;
        pdfTemplate: import("@prisma/client/runtime/library").JsonValue | null;
        mobileLogoUrl: string | null;
        auditLogsEnabled: boolean;
        credits: number | null;
    }[]>;
    getAllPlans(): Promise<{
        id: string;
        name: string;
        description: string;
        price: number;
        interval: string;
        maxUsers: number | null;
        maxProducts: number | null;
        maxSalesPerMonth: number | null;
        maxBranches: number | null;
        isActive: boolean;
        stripePriceId: string | null;
        features: {
            id: string;
            key: string;
            name: string;
            description: string | null;
            isEnabled: boolean;
        }[];
        subscriptionCount: number;
    }[]>;
    getPlanById(planId: string): Promise<{
        id: string;
        name: string;
        description: string;
        price: number;
        interval: string;
        maxUsers: number | null;
        maxProducts: number | null;
        maxSalesPerMonth: number | null;
        maxBranches: number | null;
        isActive: boolean;
        stripePriceId: string | null;
        features: any;
        subscriptionCount: number;
    }>;
    createPlan(planData: {
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
    }): Promise<{
        id: string;
        name: string;
        description: string;
        price: number;
        interval: string;
        maxUsers: number | null;
        maxProducts: number | null;
        maxSalesPerMonth: number | null;
        maxBranches: number | null;
        isActive: boolean;
        stripePriceId: string | null;
        features: {
            id: string;
            key: string;
            name: string;
            description: string | null;
            isEnabled: boolean;
        }[];
    }>;
    updatePlan(planId: string, planData: {
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
    }): Promise<{
        id: string;
        name: string;
        description: string;
        price: number;
        interval: string;
        maxUsers: number | null;
        maxProducts: number | null;
        maxSalesPerMonth: number | null;
        maxBranches: number | null;
        isActive: boolean;
        stripePriceId: string | null;
        features: any;
        subscriptionCount: number;
    }>;
    deletePlan(planId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getAllPlanFeatures(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isEnabled: boolean;
        featureKey: string;
        featureName: string;
        featureDescription: string | null;
    }[]>;
    createTenant(tenantData: {
        name: string;
        businessType: string;
        contactEmail: string;
        contactPhone?: string;
        country: string;
        owner: {
            name: string;
            email: string;
            password: string;
        };
        [key: string]: any;
    }): Promise<{
        defaultPassword: string;
        tenant: any;
        branch: {
            id: string;
            tenantId: string;
            status: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            address: string | null;
            city: string | null;
            country: string | null;
            postalCode: string | null;
            state: string | null;
            customField: string | null;
            email: string | null;
            isMainBranch: boolean;
            logo: string | null;
            manager: string | null;
            openingHours: string | null;
            phone: string | null;
            street: string | null;
        };
        user: {
            id: any;
            name: any;
            email: any;
        };
    }>;
    getAllUsers(): Promise<{
        id: string;
        name: string;
        email: string;
        isSuperadmin: boolean;
        isDisabled: boolean;
        createdAt: Date;
        tenant: {
            id: string;
            name: string;
        } | null;
        userRoles: ({
            role: {
                name: string;
            };
        } & {
            id: string;
            tenantId: string;
            userId: string;
            roleId: string;
        })[];
    }[]>;
    updateUserStatus(userId: string, isDisabled: boolean): Promise<{
        id: string;
        email: string;
        isDisabled: boolean;
        message: string;
    }>;
    deleteTenant(tenantId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
