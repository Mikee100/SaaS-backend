import { AdminService } from './admin.service';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    testEndpoint(): Promise<{
        message: string;
    }>;
    getAllTenants(): Promise<({
        _count: {
            userRoles: number;
            products: number;
            sales: number;
        };
    } & {
        id: string;
        name: string;
        businessType: string;
        contactEmail: string;
        contactPhone: string | null;
        address: string | null;
        currency: string | null;
        timezone: string | null;
        invoiceFooter: string | null;
        logoUrl: string | null;
        kraPin: string | null;
        vatNumber: string | null;
        etimsQrUrl: string | null;
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
            userId: string;
            roleId: string;
            tenantId: string;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
        isSuperadmin: boolean;
    })[]>;
    getPlatformStats(): Promise<{
        totalTenants: number;
        totalUsers: number;
        totalProducts: number;
        totalSales: number;
        activeTenants: number;
        superadminUsers: number;
        averageUsersPerTenant: string | number;
        averageProductsPerTenant: string | number;
    }>;
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
                userId: string;
                roleId: string;
                tenantId: string;
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
            responseTimes: never[];
            requests: never[];
            errors: never[];
            users: never[];
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
    getTicketResponses(id: string): Promise<{
        id: string;
        ticketId: string;
        userId: string;
        userName: string;
        message: string;
        isInternal: boolean;
        createdAt: string;
    }[]>;
    addTicketResponse(id: string, responseData: any, req: any): Promise<{
        id: string;
        ticketId: string;
        userId: any;
        userName: any;
        message: any;
        isInternal: any;
        createdAt: string;
    }>;
    updateTicket(id: string, updateData: any): Promise<any>;
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
    executeBulkAction(actionData: any, req: any): Promise<any>;
    createTenant(tenantData: any): Promise<{
        id: string;
        name: string;
        businessType: string;
        contactEmail: string;
        contactPhone: string | null;
        address: string | null;
        currency: string | null;
        timezone: string | null;
        invoiceFooter: string | null;
        logoUrl: string | null;
        kraPin: string | null;
        vatNumber: string | null;
        etimsQrUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteTenant(id: string): Promise<{
        id: string;
        name: string;
        businessType: string;
        contactEmail: string;
        contactPhone: string | null;
        address: string | null;
        currency: string | null;
        timezone: string | null;
        invoiceFooter: string | null;
        logoUrl: string | null;
        kraPin: string | null;
        vatNumber: string | null;
        etimsQrUrl: string | null;
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
            userId: string;
            roleId: string;
            tenantId: string;
        })[];
        _count: {
            userRoles: number;
            products: number;
            sales: number;
        };
    } & {
        id: string;
        name: string;
        businessType: string;
        contactEmail: string;
        contactPhone: string | null;
        address: string | null;
        currency: string | null;
        timezone: string | null;
        invoiceFooter: string | null;
        logoUrl: string | null;
        kraPin: string | null;
        vatNumber: string | null;
        etimsQrUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
}
