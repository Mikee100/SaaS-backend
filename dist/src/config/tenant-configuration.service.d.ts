import { PrismaService } from '../prisma.service';
export interface TenantConfigurationItem {
    key: string;
    value: string;
    description?: string;
    category: 'stripe' | 'payment' | 'billing' | 'general';
    isEncrypted: boolean;
    isPublic: boolean;
}
export declare class TenantConfigurationService {
    private readonly prisma;
    private readonly logger;
    private readonly encryptionKey;
    constructor(prisma: PrismaService);
    private encryptValue;
    private decryptValue;
    getTenantConfiguration(tenantId: string, key: string): Promise<string | null>;
    setTenantConfiguration(tenantId: string, key: string, value: string, options?: Partial<TenantConfigurationItem>): Promise<void>;
    getAllTenantConfigurations(tenantId: string, category?: string): Promise<TenantConfigurationItem[]>;
    deleteTenantConfiguration(tenantId: string, key: string): Promise<void>;
    getStripeSecretKey(tenantId: string): Promise<string | null>;
    getStripePublishableKey(tenantId: string): Promise<string | null>;
    getStripeWebhookSecret(tenantId: string): Promise<string | null>;
    setStripeSecretKey(tenantId: string, value: string): Promise<void>;
    setStripePublishableKey(tenantId: string, value: string): Promise<void>;
    setStripeWebhookSecret(tenantId: string, value: string): Promise<void>;
    getStripePriceId(tenantId: string, planName: string): Promise<string | null>;
    setStripePriceId(tenantId: string, planName: string, priceId: string): Promise<void>;
    isStripeConfigured(tenantId: string): Promise<boolean>;
}
