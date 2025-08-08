import { ConfigurationService, ConfigurationItem } from '../config/configuration.service';
interface UpdateConfigurationDto {
    value: string;
    description?: string;
    category?: 'security' | 'api' | 'external_services' | 'email' | 'general';
    isEncrypted?: boolean;
    isPublic?: boolean;
}
interface CreateConfigurationDto {
    key: string;
    value: string;
    description?: string;
    category: 'security' | 'api' | 'external_services' | 'email' | 'general';
    isEncrypted?: boolean;
    isPublic?: boolean;
}
export declare class ConfigurationController {
    private readonly configurationService;
    constructor(configurationService: ConfigurationService);
    getAllConfigurations(): Promise<ConfigurationItem[]>;
    getConfigurationsByCategory(category: string): Promise<ConfigurationItem[]>;
    getConfiguration(key: string): Promise<{
        error: string;
        key?: undefined;
        value?: undefined;
    } | {
        key: string;
        value: string;
        error?: undefined;
    }>;
    createConfiguration(dto: CreateConfigurationDto): Promise<{
        message: string;
    }>;
    updateConfiguration(key: string, dto: UpdateConfigurationDto): Promise<{
        message: string;
    }>;
    deleteConfiguration(key: string): Promise<{
        message: string;
    }>;
    initializeDefaultConfigurations(): Promise<{
        message: string;
    }>;
    getCategories(): Promise<{
        value: string;
        label: string;
    }[]>;
}
export {};
