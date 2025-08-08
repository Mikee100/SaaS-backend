import { PrismaService } from '../prisma.service';
export declare class AdminService {
    private prisma;
    constructor(prisma: PrismaService);
    getAllTenants(): Promise<({
        _count: {
            products: number;
            sales: number;
            userRoles: number;
        };
    } & {
        id: string;
        name: string;
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
        logoUrl: string | null;
        favicon: string | null;
        receiptLogo: string | null;
        watermark: string | null;
        primaryColor: string | null;
        secondaryColor: string | null;
        customDomain: string | null;
        whiteLabel: boolean;
        apiKey: string | null;
        webhookUrl: string | null;
        rateLimit: number | null;
        customIntegrations: boolean;
        ssoEnabled: boolean;
        auditLogs: boolean;
        backupRestore: boolean;
        stripeCustomerId: string | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    getAllUsers(): Promise<({
        userRoles: ({
            tenant: {
                id: string;
                name: string;
            };
            role: {
                id: string;
                name: string;
                description: string | null;
            };
        } & {
            id: string;
            tenantId: string;
            userId: string;
            roleId: string;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        isSuperadmin: boolean;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
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
            email: string;
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
        logoUrl: string | null;
        favicon: string | null;
        receiptLogo: string | null;
        watermark: string | null;
        primaryColor: string | null;
        secondaryColor: string | null;
        customDomain: string | null;
        whiteLabel: boolean;
        apiKey: string | null;
        webhookUrl: string | null;
        rateLimit: number | null;
        customIntegrations: boolean;
        ssoEnabled: boolean;
        auditLogs: boolean;
        backupRestore: boolean;
        stripeCustomerId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteTenant(id: string): Promise<{
        id: string;
        name: string;
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
        logoUrl: string | null;
        favicon: string | null;
        receiptLogo: string | null;
        watermark: string | null;
        primaryColor: string | null;
        secondaryColor: string | null;
        customDomain: string | null;
        whiteLabel: boolean;
        apiKey: string | null;
        webhookUrl: string | null;
        rateLimit: number | null;
        customIntegrations: boolean;
        ssoEnabled: boolean;
        auditLogs: boolean;
        backupRestore: boolean;
        stripeCustomerId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getTenantById(id: string): Promise<({
        userRoles: ({
            user: {
                id: string;
                name: string;
                email: string;
            };
            role: {
                id: string;
                name: string;
                description: string | null;
            };
        } & {
            id: string;
            tenantId: string;
            userId: string;
            roleId: string;
        })[];
        _count: {
            products: number;
            sales: number;
            userRoles: number;
        };
    } & {
        id: string;
        name: string;
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
        logoUrl: string | null;
        favicon: string | null;
        receiptLogo: string | null;
        watermark: string | null;
        primaryColor: string | null;
        secondaryColor: string | null;
        customDomain: string | null;
        whiteLabel: boolean;
        apiKey: string | null;
        webhookUrl: string | null;
        rateLimit: number | null;
        customIntegrations: boolean;
        ssoEnabled: boolean;
        auditLogs: boolean;
        backupRestore: boolean;
        stripeCustomerId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
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
    private calculateStorageUsage;
    private getLastUserActivity;
    private getActiveDays;
    private calculatePerformanceMetrics;
    private getApiCallCount;
    private getActiveUsers;
    private getPeakConcurrentUsers;
    private calculateCLV;
    private getTotalSessions;
    private getAverageSessionDuration;
    private generateHistoricalData;
    getTenantComparison(): Promise<{
        metric: string;
        average: number;
        median: number;
        topTenant: {
            name: string;
            value: number;
        };
        bottomTenant: {
            name: string;
            value: number;
        };
    }[]>;
    getTenantBackups(): Promise<{
        id: string;
        tenantId: string;
        tenantName: string;
        type: string;
        status: string;
        size: number;
        createdAt: string;
        completedAt: string;
        downloadUrl: string;
        restorePoints: number;
        records: {
            users: number;
            products: number;
            sales: number;
            inventory: number;
        };
        backupHistory: {
            id: string;
            createdAt: string;
            type: string;
            status: string;
            size: number;
        }[];
    }[]>;
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
}
