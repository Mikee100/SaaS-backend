import { TenantService } from './tenant.service';
export declare class TenantController {
    private readonly tenantService;
    constructor(tenantService: TenantService);
    getMyTenant(req: any): Promise<{
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
    updateMyTenant(req: any, dto: any): Promise<{
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
    uploadLogo(req: any, file: Express.Multer.File): Promise<{
        logoUrl: string;
    }>;
    registerTenant(body: any): Promise<{
        tenant: any;
    }>;
}
