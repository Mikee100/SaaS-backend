import { TenantService } from './tenant.service';
export declare class TenantController {
    private readonly tenantService;
    constructor(tenantService: TenantService);
    getMyTenant(req: any): Promise<{
        id: string;
        name: string;
        currency: string | null;
        createdAt: Date;
        updatedAt: Date;
        businessType: string;
        contactEmail: string;
        contactPhone: string | null;
        address: string | null;
        timezone: string | null;
        invoiceFooter: string | null;
        logoUrl: string | null;
        kraPin: string | null;
        vatNumber: string | null;
        etimsQrUrl: string | null;
    } | null>;
    updateMyTenant(req: any, dto: any): Promise<{
        id: string;
        name: string;
        currency: string | null;
        createdAt: Date;
        updatedAt: Date;
        businessType: string;
        contactEmail: string;
        contactPhone: string | null;
        address: string | null;
        timezone: string | null;
        invoiceFooter: string | null;
        logoUrl: string | null;
        kraPin: string | null;
        vatNumber: string | null;
        etimsQrUrl: string | null;
    }>;
    uploadLogo(req: any, file: Express.Multer.File): Promise<{
        logoUrl: string;
    }>;
}
