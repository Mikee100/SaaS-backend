import { PrismaService } from '../prisma.service';
export declare class BillingService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getPlans(): Promise<{
        id: string;
        name: string;
        description: string | null;
        price: number;
        currency: string;
        interval: string;
        features: import("@prisma/client/runtime/library").JsonValue | null;
        maxUsers: number | null;
        maxProducts: number | null;
        maxSalesPerMonth: number | null;
        analyticsEnabled: boolean;
        advancedReports: boolean;
        prioritySupport: boolean;
        customBranding: boolean;
        apiAccess: boolean;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[] | {
        id: string;
        name: string;
        price: number;
        interval: string;
        maxUsers: number;
        maxProducts: number;
        maxSalesPerMonth: number;
        analyticsEnabled: boolean;
        advancedReports: boolean;
        prioritySupport: boolean;
        customBranding: boolean;
        apiAccess: boolean;
    }[]>;
    getCurrentSubscription(tenantId: string): Promise<{
        plan: {
            name: string;
            price: number;
        };
        status: string;
        currentPeriodStart: null;
        currentPeriodEnd: null;
        id?: undefined;
        startDate?: undefined;
        endDate?: undefined;
        cancelledAt?: undefined;
    } | {
        id: string;
        status: string;
        plan: {
            id: string;
            name: string;
            description: string | null;
            price: number;
            currency: string;
            interval: string;
            features: import("@prisma/client/runtime/library").JsonValue | null;
            maxUsers: number | null;
            maxProducts: number | null;
            maxSalesPerMonth: number | null;
            analyticsEnabled: boolean;
            advancedReports: boolean;
            prioritySupport: boolean;
            customBranding: boolean;
            apiAccess: boolean;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
        startDate: Date;
        endDate: Date;
        cancelledAt: Date | null;
        currentPeriodStart?: undefined;
        currentPeriodEnd?: undefined;
    }>;
    hasFeature(tenantId: string, feature: string): Promise<boolean>;
    getPlanLimits(tenantId: string): Promise<{
        maxUsers: number | null;
        maxProducts: number | null;
        maxSalesPerMonth: number | null;
        analyticsEnabled: boolean;
        advancedReports: boolean;
        prioritySupport: boolean;
        customBranding: boolean;
        apiAccess: boolean;
    }>;
    checkLimit(tenantId: string, limitType: 'users' | 'products' | 'sales'): Promise<{
        allowed: boolean;
        current: number;
        limit: number;
    }>;
    getInvoices(tenantId: string): Promise<{
        id: string;
        description: string | null;
        currency: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        subscriptionId: string;
        amount: number;
        dueDate: Date;
        paidAt: Date | null;
        invoiceNumber: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
}
