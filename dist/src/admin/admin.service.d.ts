import { PrismaService } from '../prisma.service';
export declare class AdminService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getAllTenants(): Promise<({
        _count: {
            sales: number;
            users: number;
            products: number;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        stripeCustomerId: string | null;
        businessType: string;
        contactEmail: string;
        contactPhone: string | null;
        businessCategory: string | null;
        businessSubcategory: string | null;
        primaryProducts: import("@prisma/client/runtime/library").JsonValue | null;
        secondaryProducts: import("@prisma/client/runtime/library").JsonValue | null;
        businessDescription: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        postalCode: string | null;
        latitude: number | null;
        longitude: number | null;
        foundedYear: number | null;
        employeeCount: string | null;
        annualRevenue: string | null;
        businessHours: import("@prisma/client/runtime/library").JsonValue | null;
        website: string | null;
        socialMedia: import("@prisma/client/runtime/library").JsonValue | null;
        kraPin: string | null;
        vatNumber: string | null;
        etimsQrUrl: string | null;
        businessLicense: string | null;
        taxId: string | null;
        currency: string | null;
        timezone: string | null;
        invoiceFooter: string | null;
        credits: number | null;
        logoUrl: string | null;
        loginLogoUrl: string | null;
        favicon: string | null;
        receiptLogo: string | null;
        watermark: string | null;
        dashboardLogoUrl: string | null;
        emailLogoUrl: string | null;
        mobileLogoUrl: string | null;
        logoSettings: import("@prisma/client/runtime/library").JsonValue | null;
        primaryColor: string | null;
        secondaryColor: string | null;
        customDomain: string | null;
        whiteLabel: boolean;
        apiKey: string | null;
        webhookUrl: string | null;
        rateLimit: number | null;
        customIntegrations: boolean;
        ssoEnabled: boolean;
        auditLogsEnabled: boolean;
        backupRestore: boolean;
    })[]>;
    getAllUsers(): Promise<({
        userRoles: ({
            role: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string | null;
                description: string | null;
            };
            tenant: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            tenantId: string;
            userId: string;
            roleId: string;
        })[];
    } & {
        id: string;
        email: string;
        password: string;
        name: string;
        isSuperadmin: boolean;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
    })[]>;
    getPlatformStats(): Promise<{
        totalTenants: number;
        totalUsers: number;
        totalProducts: number;
        totalSales: number;
        totalRevenue: number;
        activeSubscriptions: number;
        totalStorage: number;
        nearCapacityTenants: number;
        totalMRR: number;
    }>;
    private calculateTotalStorage;
    private getNearCapacityTenants;
    private calculateTotalMRR;
    getPlatformLogs(): Promise<({
        user: {
            id: string;
            email: string;
            name: string;
            userRoles: ({
                tenant: {
                    id: string;
                    name: string;
                };
            } & {
                id: string;
                tenantId: string;
                userId: string;
                roleId: string;
            })[];
        } | null;
    } & {
        id: string;
        createdAt: Date;
        userId: string | null;
        action: string;
        details: import("@prisma/client/runtime/library").JsonValue | null;
        ip: string | null;
    })[]>;
    createTenant(tenantData: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        stripeCustomerId: string | null;
        businessType: string;
        contactEmail: string;
        contactPhone: string | null;
        businessCategory: string | null;
        businessSubcategory: string | null;
        primaryProducts: import("@prisma/client/runtime/library").JsonValue | null;
        secondaryProducts: import("@prisma/client/runtime/library").JsonValue | null;
        businessDescription: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        postalCode: string | null;
        latitude: number | null;
        longitude: number | null;
        foundedYear: number | null;
        employeeCount: string | null;
        annualRevenue: string | null;
        businessHours: import("@prisma/client/runtime/library").JsonValue | null;
        website: string | null;
        socialMedia: import("@prisma/client/runtime/library").JsonValue | null;
        kraPin: string | null;
        vatNumber: string | null;
        etimsQrUrl: string | null;
        businessLicense: string | null;
        taxId: string | null;
        currency: string | null;
        timezone: string | null;
        invoiceFooter: string | null;
        credits: number | null;
        logoUrl: string | null;
        loginLogoUrl: string | null;
        favicon: string | null;
        receiptLogo: string | null;
        watermark: string | null;
        dashboardLogoUrl: string | null;
        emailLogoUrl: string | null;
        mobileLogoUrl: string | null;
        logoSettings: import("@prisma/client/runtime/library").JsonValue | null;
        primaryColor: string | null;
        secondaryColor: string | null;
        customDomain: string | null;
        whiteLabel: boolean;
        apiKey: string | null;
        webhookUrl: string | null;
        rateLimit: number | null;
        customIntegrations: boolean;
        ssoEnabled: boolean;
        auditLogsEnabled: boolean;
        backupRestore: boolean;
    }>;
    deleteTenant(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        stripeCustomerId: string | null;
        businessType: string;
        contactEmail: string;
        contactPhone: string | null;
        businessCategory: string | null;
        businessSubcategory: string | null;
        primaryProducts: import("@prisma/client/runtime/library").JsonValue | null;
        secondaryProducts: import("@prisma/client/runtime/library").JsonValue | null;
        businessDescription: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        postalCode: string | null;
        latitude: number | null;
        longitude: number | null;
        foundedYear: number | null;
        employeeCount: string | null;
        annualRevenue: string | null;
        businessHours: import("@prisma/client/runtime/library").JsonValue | null;
        website: string | null;
        socialMedia: import("@prisma/client/runtime/library").JsonValue | null;
        kraPin: string | null;
        vatNumber: string | null;
        etimsQrUrl: string | null;
        businessLicense: string | null;
        taxId: string | null;
        currency: string | null;
        timezone: string | null;
        invoiceFooter: string | null;
        credits: number | null;
        logoUrl: string | null;
        loginLogoUrl: string | null;
        favicon: string | null;
        receiptLogo: string | null;
        watermark: string | null;
        dashboardLogoUrl: string | null;
        emailLogoUrl: string | null;
        mobileLogoUrl: string | null;
        logoSettings: import("@prisma/client/runtime/library").JsonValue | null;
        primaryColor: string | null;
        secondaryColor: string | null;
        customDomain: string | null;
        whiteLabel: boolean;
        apiKey: string | null;
        webhookUrl: string | null;
        rateLimit: number | null;
        customIntegrations: boolean;
        ssoEnabled: boolean;
        auditLogsEnabled: boolean;
        backupRestore: boolean;
    }>;
    getTenantById(id: string): Promise<{
        users: {
            id: string;
            email: string;
            name: string;
        }[];
        sales?: {
            id: string;
            createdAt: Date;
            tenantId: string;
            userId: string;
            total: number;
            paymentType: string;
            customerName: string | null;
            customerPhone: string | null;
            mpesaTransactionId: string | null;
            idempotencyKey: string | null;
            vatAmount: number | null;
            branchId: string | null;
        }[] | undefined;
        products?: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            branchId: string | null;
            description: string | null;
            price: number;
            customFields: import("@prisma/client/runtime/library").JsonValue | null;
            sku: string;
            stock: number;
        }[] | undefined;
        _count?: {
            sales: number;
            products: number;
        } | undefined;
        id?: string | undefined;
        name?: string | undefined;
        createdAt?: Date | undefined;
        updatedAt?: Date | undefined;
        stripeCustomerId?: string | null | undefined;
        businessType?: string | undefined;
        contactEmail?: string | undefined;
        contactPhone?: string | null | undefined;
        businessCategory?: string | null | undefined;
        businessSubcategory?: string | null | undefined;
        primaryProducts?: import("@prisma/client/runtime/library").JsonValue | undefined;
        secondaryProducts?: import("@prisma/client/runtime/library").JsonValue | undefined;
        businessDescription?: string | null | undefined;
        address?: string | null | undefined;
        city?: string | null | undefined;
        state?: string | null | undefined;
        country?: string | null | undefined;
        postalCode?: string | null | undefined;
        latitude?: number | null | undefined;
        longitude?: number | null | undefined;
        foundedYear?: number | null | undefined;
        employeeCount?: string | null | undefined;
        annualRevenue?: string | null | undefined;
        businessHours?: import("@prisma/client/runtime/library").JsonValue | undefined;
        website?: string | null | undefined;
        socialMedia?: import("@prisma/client/runtime/library").JsonValue | undefined;
        kraPin?: string | null | undefined;
        vatNumber?: string | null | undefined;
        etimsQrUrl?: string | null | undefined;
        businessLicense?: string | null | undefined;
        taxId?: string | null | undefined;
        currency?: string | null | undefined;
        timezone?: string | null | undefined;
        invoiceFooter?: string | null | undefined;
        credits?: number | null | undefined;
        logoUrl?: string | null | undefined;
        loginLogoUrl?: string | null | undefined;
        favicon?: string | null | undefined;
        receiptLogo?: string | null | undefined;
        watermark?: string | null | undefined;
        dashboardLogoUrl?: string | null | undefined;
        emailLogoUrl?: string | null | undefined;
        mobileLogoUrl?: string | null | undefined;
        logoSettings?: import("@prisma/client/runtime/library").JsonValue | undefined;
        primaryColor?: string | null | undefined;
        secondaryColor?: string | null | undefined;
        customDomain?: string | null | undefined;
        whiteLabel?: boolean | undefined;
        apiKey?: string | null | undefined;
        webhookUrl?: string | null | undefined;
        rateLimit?: number | null | undefined;
        customIntegrations?: boolean | undefined;
        ssoEnabled?: boolean | undefined;
        auditLogsEnabled?: boolean | undefined;
        backupRestore?: boolean | undefined;
    }>;
    getSystemHealth(): Promise<{
        database: {
            status: "healthy";
            responseTime: number;
            connections: number;
            maxConnections: number;
        };
        api: {
            status: "healthy";
            responseTime: number;
            requestsPerMinute: number;
            errorRate: number;
        };
        storage: {
            status: "healthy";
            usedSpace: number;
            totalSpace: number;
            usagePercentage: number;
        };
        memory: {
            status: "healthy";
            usedMemory: number;
            totalMemory: number;
            usagePercentage: number;
        };
        activeIssues: never[];
        recentAlerts: {
            id: string;
            type: string;
            message: string;
            severity: "warning";
            timestamp: string;
        }[];
    }>;
    getPerformanceMetrics(): Promise<{
        averageResponseTime: number;
        totalRequests: number;
        errorRate: number;
        activeUsers: number;
        peakConcurrentUsers: number;
        historicalData: {
            responseTimes: {
                timestamp: string;
                value: number;
            }[];
            requests: {
                timestamp: string;
                value: number;
            }[];
            errors: {
                timestamp: string;
                value: number;
            }[];
            users: {
                timestamp: string;
                value: number;
            }[];
        };
    }>;
    getSupportTickets(status?: string, priority?: string): Promise<({
        id: string;
        tenantId: string;
        tenantName: string;
        userId: string;
        userName: string;
        userEmail: string;
        subject: string;
        description: string;
        priority: "high";
        status: "open";
        category: "technical";
        createdAt: string;
        updatedAt: string;
    } | {
        id: string;
        tenantId: string;
        tenantName: string;
        userId: string;
        userName: string;
        userEmail: string;
        subject: string;
        description: string;
        priority: "medium";
        status: "in_progress";
        category: "billing";
        createdAt: string;
        updatedAt: string;
    })[]>;
    getSupportTicket(id: string): Promise<{
        id: string;
        tenantId: string;
        tenantName: string;
        userId: string;
        userName: string;
        userEmail: string;
        subject: string;
        description: string;
        priority: "high";
        status: "open";
        category: "technical";
        createdAt: string;
        updatedAt: string;
    }>;
    getTicketResponses(ticketId: string): Promise<{
        id: string;
        ticketId: string;
        userId: string;
        userName: string;
        message: string;
        isInternal: boolean;
        createdAt: string;
    }[]>;
    addTicketResponse(ticketId: string, responseData: any, user: any): Promise<{
        id: string;
        ticketId: string;
        userId: any;
        userName: any;
        message: any;
        isInternal: any;
        createdAt: string;
    }>;
    updateTicket(ticketId: string, updateData: any): Promise<any>;
    getBulkOperations(): Promise<({
        id: string;
        type: string;
        action: string;
        description: string;
        affectedCount: number;
        status: "completed";
        progress: number;
        createdAt: string;
        completedAt: string;
    } | {
        id: string;
        type: string;
        action: string;
        description: string;
        affectedCount: number;
        status: "running";
        progress: number;
        createdAt: string;
        completedAt?: undefined;
    })[]>;
    executeBulkAction(actionData: any, user: any): Promise<any>;
    getTenantAnalytics(): Promise<any[]>;
    private getPeakConcurrentUsers;
    private calculateCLV;
    private getTotalSessions;
    createTenantBackup(backupData: any): Promise<{
        id: string;
        tenantId: any;
        tenantName: string;
        type: any;
        status: string;
        size: number;
        createdAt: string;
        description: any;
        estimatedDuration: number;
        records: {
            users: number;
            products: number;
            sales: number;
            inventory: number;
        };
    }>;
    restoreTenantBackup(restoreData: any): Promise<{
        id: string;
        backupId: any;
        sourceTenantId: any;
        targetTenantId: any;
        status: string;
        progress: number;
        createdAt: string;
        estimatedDuration: number;
        options: any;
    }>;
    getTenantMigrations(): Promise<{
        id: string;
        type: string;
        status: string;
        progress: number;
        createdAt: string;
        completedAt: string | null;
        details: {
            tables: string[];
            records: number;
            size: number;
        };
        sourceTenantId: string;
        sourceTenantName: string;
        records: number;
        size: number;
    }[]>;
    migrateTenant(migrationData: any): Promise<{
        id: string;
        sourceTenantId: any;
        sourceTenantName: string;
        targetTenantId: any;
        targetTenantName: any;
        type: any;
        status: string;
        progress: number;
        createdAt: string;
        estimatedDuration: number;
        records: number;
        size: number;
        options: any;
    }>;
    private getBackupById;
    private generateBackupHistory;
    private generateMigrationHistory;
    getTenantResources(): Promise<{
        id: string;
        tenantId: string;
        tenantName: string;
        currentUsage: {
            cpu: number;
            memory: number;
            storage: number;
            bandwidth: number;
            databaseConnections: number;
            apiCalls: number;
        };
        limits: {
            cpu: number;
            memory: number;
            storage: number;
            bandwidth: number;
            databaseConnections: number;
            apiCalls: number;
        };
        plan: {
            name: string;
            tier: string;
            cost: number;
        };
        recommendations: {
            upgrade: boolean;
            downgrade: boolean;
            reason: string;
            suggestedPlan: string;
        };
        historicalUsage: {
            cpu: {
                date: string;
                usage: number;
            }[];
            memory: {
                date: string;
                usage: number;
            }[];
            storage: {
                date: string;
                usage: number;
            }[];
            bandwidth: {
                date: string;
                usage: number;
            }[];
        };
    }[]>;
    getTenantPlans(): Promise<{
        id: string;
        name: string;
        tier: string;
        limits: {
            cpu: number;
            memory: number;
            storage: number;
            bandwidth: number;
            databaseConnections: number;
            apiCalls: number;
        };
        cost: number;
        features: string[];
    }[]>;
    updateTenantPlan(tenantId: string, planData: any): Promise<{
        id: string;
        planId: any;
        updatedAt: string;
    }>;
    private generateHistoricalUsage;
    trackApiUsage(userId: string, endpoint: string, responseTime: number, success: boolean): Promise<void>;
    getRealTimeMetrics(): Promise<{
        totalCalls: number;
        successfulCalls: number;
        errorRate: number;
        averageResponseTime: number;
        uptime: number;
    }>;
    getTenantUsage(tenantId: string): Promise<{
        userUsage: number;
        productUsage: number;
        storageUsage: number;
        subscription: null;
    } | {
        userUsage: number;
        productUsage: number;
        storageUsage: number;
        subscription: {
            plan: string;
            status: string;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
        };
    }>;
    getTenantStats(tenantId: string): Promise<{
        userCount: number;
        productCount: number;
        saleCount: number;
        inventoryCount: number;
        totalSales: number;
        activeSubscription: {
            plan: string;
            status: string;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
        } | null;
    }>;
    getTenantComparison(): Promise<{
        id: string;
        name: string;
        plan: string;
        userCount: number;
        productCount: number;
        saleCount: number;
        inventoryCount: number;
        createdAt: Date;
    }[]>;
    getTenantBackups(): Promise<never[]>;
}
