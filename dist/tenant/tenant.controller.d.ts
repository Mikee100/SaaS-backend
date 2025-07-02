import { TenantService } from './tenant.service';
export declare class TenantController {
    private readonly tenantService;
    constructor(tenantService: TenantService);
    createTenant(body: {
        name: string;
        businessType: string;
        contactEmail: string;
        contactPhone?: string;
    }): Promise<any>;
    getAllTenants(): Promise<any[]>;
}
