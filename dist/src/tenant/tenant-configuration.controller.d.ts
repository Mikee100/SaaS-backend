import { TenantConfigurationService, TenantConfigurationItem } from '../config/tenant-configuration.service';
interface CreateConfigurationDto {
    key: string;
    value: string;
    description?: string;
    category: 'stripe' | 'payment' | 'billing' | 'general';
    isEncrypted?: boolean;
    isPublic?: boolean;
}
interface UpdateConfigurationDto {
    value: string;
    description?: string;
    category?: 'stripe' | 'payment' | 'billing' | 'general';
    isEncrypted?: boolean;
    isPublic?: boolean;
}
interface StripeConfigurationDto {
    secretKey: string;
    publishableKey: string;
    webhookSecret?: string;
    basicPriceId?: string;
    proPriceId?: string;
    enterprisePriceId?: string;
}
export declare class TenantConfigurationController {
    private readonly tenantConfigurationService;
    constructor(tenantConfigurationService: TenantConfigurationService);
    getAllConfigurations(req: any): Promise<TenantConfigurationItem[]>;
    getConfigurationsByCategory(category: string, req: any): Promise<TenantConfigurationItem[]>;
    getConfiguration(key: string, req: any): Promise<{
        key: string;
        value: string | null;
    }>;
    createConfiguration(dto: CreateConfigurationDto, req: any): Promise<{
        message: string;
    }>;
    updateConfiguration(key: string, dto: UpdateConfigurationDto, req: any): Promise<{
        message: string;
    }>;
    deleteConfiguration(key: string, req: any): Promise<{
        message: string;
    }>;
    getStripeStatus(req: any): Promise<{
        isConfigured: boolean;
    }>;
    getStripeKeys(req: any): Promise<{
        secretKey: string | null;
        publishableKey: string | null;
        webhookSecret: string | null;
    }>;
    configureStripe(dto: StripeConfigurationDto, req: any): Promise<{
        message: string;
    }>;
    getStripePriceIds(req: any): Promise<{
        basicPriceId: string | null;
        proPriceId: string | null;
        enterprisePriceId: string | null;
    }>;
    setStripePriceIds(dto: {
        basicPriceId?: string;
        proPriceId?: string;
        enterprisePriceId?: string;
    }, req: any): Promise<{
        message: string;
    }>;
}
export {};
