import { UserService } from './user.service';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    createUser(body: any, req: any): Promise<{
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
    }>;
    getUsers(req: any): Promise<({
        userRoles: ({
            tenant: {
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
            };
            role: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string | null;
                description: string | null;
            };
        } & {
            id: string;
            tenantId: string;
            userId: string;
            roleId: string;
        })[];
        userPermissions: ({
            permissionRef: {
                id: string;
                name: string;
                description: string | null;
            };
        } & {
            id: string;
            tenantId: string;
            userId: string;
            permission: string;
            grantedBy: string;
            grantedAt: Date;
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
    getProtected(req: any): {
        message: string;
        user: any;
    };
    getMe(req: any): Promise<{
        id: any;
        email: any;
        name: any;
        tenantId: any;
        roles: any;
    }>;
    updateUser(req: any, id: string, body: {
        name?: string;
        role?: string;
    }): Promise<any>;
    updatePermissions(id: string, body: {
        permissions: {
            key: string;
            note?: string;
        }[];
    }, req: any): Promise<({
        userPermissions: ({
            permissionRef: {
                id: string;
                name: string;
                description: string | null;
            };
        } & {
            id: string;
            tenantId: string;
            userId: string;
            permission: string;
            grantedBy: string;
            grantedAt: Date;
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
    }) | null>;
    getUserPermissions(id: string, req: any): Promise<{
        id: string;
        tenantId: string;
        userId: string;
        permission: string;
        grantedBy: string;
        grantedAt: Date;
    }[]>;
    updatePreferences(req: any, body: {
        notificationPreferences?: any;
        language?: string;
        region?: string;
    }): Promise<{
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
    }>;
    deleteUser(req: any, id: string): Promise<any>;
}
