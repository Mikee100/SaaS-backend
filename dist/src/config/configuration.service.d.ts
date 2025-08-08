import { PrismaService } from '../prisma.service';
export interface ConfigurationItem {
    key: string;
    value: string;
    description?: string;
    category: 'security' | 'api' | 'external_services' | 'email' | 'general';
    isEncrypted: boolean;
    isPublic: boolean;
}
export declare class ConfigurationService {
    private readonly prisma;
    private readonly logger;
    private readonly encryptionKey;
    constructor(prisma: PrismaService);
    private encryptValue;
    private decryptValue;
    getConfiguration(key: string): Promise<string | null>;
    setConfiguration(key: string, value: string, options?: Partial<ConfigurationItem>): Promise<void>;
    getAllConfigurations(category?: string): Promise<ConfigurationItem[]>;
    deleteConfiguration(key: string): Promise<void>;
    getApiBaseUrl(): Promise<string>;
    getFrontendUrl(): Promise<string>;
    getJwtSecret(): Promise<string>;
    getAiServiceUrl(): Promise<string>;
    getEmailServiceUrl(): Promise<string>;
    initializeDefaultConfigurations(): Promise<void>;
}
