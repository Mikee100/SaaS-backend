import { PrismaService } from '../prisma.service';
import { UserService } from '../user/user.service';
export declare class TenantService {
    private prisma;
    private userService;
    constructor(prisma: PrismaService, userService: UserService);
    createTenant(data: {
        name: string;
        businessType: string;
        contactEmail: string;
        contactPhone?: string;
    }): Promise<any>;
    getAllTenants(): Promise<any[]>;
    getTenantById(tenantId: string): Promise<{
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
    } | null>;
    updateTenant(tenantId: string, dto: any): Promise<{
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
    createOwnerUser(data: {
        name: string;
        email: string;
        password: string;
        tenantId: string;
    }): Promise<{
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
    }>;
}
