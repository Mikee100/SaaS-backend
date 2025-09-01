import { UserService } from './user.service';
export declare class UserController {
    private readonly userService;
    updateUserPermissions(req: any, id: string, body: {
        permissions: string[];
    }): Promise<{
        success: boolean;
    }>;
    constructor(userService: UserService);
    createUser(body: any, req: any): Promise<any>;
    getUsers(tenantId: string): Promise<{
        permissions: string[];
        userRoles: ({
            role: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                tenantId: string | null;
            };
            tenant: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                whiteLabel: boolean;
                ssoEnabled: boolean;
                backupRestore: boolean;
                customIntegrations: boolean;
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
                apiKey: string | null;
                webhookUrl: string | null;
                rateLimit: number | null;
                auditLogsEnabled: boolean;
            };
        } & {
            id: string;
            tenantId: string;
            roleId: string;
            userId: string;
        })[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        tenantId: string | null;
        email: string;
        password: string;
        isSuperadmin: boolean;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
        branchId: string | null;
    }[]>;
    getProtected(req: any): {
        message: string;
        user: any;
    };
    getMe(req: any): Promise<{
        id: any;
        tenantId: any;
        permissions: string[];
        createdAt: Date;
        updatedAt: Date;
        name: string;
        email: string;
        password: string;
        isSuperadmin: boolean;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
        branchId: string | null;
    }>;
    updateUser(req: any, id: string, body: {
        name?: string;
        role?: string;
    }): Promise<any>;
    updatePreferences(req: any, body: {
        notificationPreferences?: any;
        language?: string;
        region?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        tenantId: string | null;
        email: string;
        password: string;
        isSuperadmin: boolean;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        region: string | null;
        branchId: string | null;
    }>;
    deleteUser(req: any, id: string): Promise<any>;
}
