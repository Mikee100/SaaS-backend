import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as crypto from 'crypto';

export interface ConfigurationItem {
  key: string;
  value: string;
  description?: string;
  category: 'security' | 'api' | 'external_services' | 'email' | 'general';
  isEncrypted: boolean;
  isPublic: boolean;
}

@Injectable()
export class ConfigurationService {
  private readonly logger = new Logger(ConfigurationService.name);
  private readonly encryptionKey: string;

  constructor(private readonly prisma: PrismaService) {
    // Require encryption key - fail if not set
    if (!process.env.CONFIG_ENCRYPTION_KEY) {
      this.logger.error(
        'CONFIG_ENCRYPTION_KEY environment variable is required but not set. ' +
        'Please set it in your environment variables before starting the application.'
      );
      throw new Error(
        'CONFIG_ENCRYPTION_KEY environment variable is required. ' +
        'Application cannot start without a valid encryption key.'
      );
    }

    // Validate encryption key length (minimum 32 characters for AES-256)
    if (process.env.CONFIG_ENCRYPTION_KEY.length < 32) {
      this.logger.error(
        'CONFIG_ENCRYPTION_KEY must be at least 32 characters long for AES-256 encryption.'
      );
      throw new Error(
        'CONFIG_ENCRYPTION_KEY must be at least 32 characters long.'
      );
    }

    this.encryptionKey = process.env.CONFIG_ENCRYPTION_KEY;
    this.logger.log('Configuration service initialized with encryption key');
  }

  private encryptValue(value: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(this.encryptionKey.slice(0, 32)),
      iv,
    );
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decryptValue(encryptedValue: string): string {
    const [ivHex, encrypted] = encryptedValue.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(this.encryptionKey.slice(0, 32)),
      iv,
    );
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async getConfiguration(key: string): Promise<string | null> {
    try {
      const config = await this.prisma.systemConfiguration.findUnique({
        where: { key },
      });

      if (!config) {
        return null;
      }

      return config.isEncrypted
        ? this.decryptValue(config.value)
        : config.value;
    } catch (error) {
      this.logger.error(`Failed to get configuration for key: ${key}`, error);
      return null;
    }
  }

  async setConfiguration(
    key: string,
    value: string,
    options: Partial<ConfigurationItem> = {},
  ): Promise<void> {
    try {
      const {
        description = '',
        category = 'general',
        isEncrypted = false,
        isPublic = false,
      } = options;

      const finalValue = isEncrypted ? this.encryptValue(value) : value;

      await this.prisma.systemConfiguration.upsert({
        where: { key },
        update: {
          value: finalValue,
          description,
          category,
          isEncrypted,
          isPublic,
          updatedAt: new Date(),
        },
        create: {
          id: `config_${Date.now()}`,
          key,
          value: finalValue,
          description,
          category,
          isEncrypted,
          isPublic,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Configuration updated: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to set configuration for key: ${key}`, error);
      throw error;
    }
  }

  async getAllConfigurations(category?: string): Promise<ConfigurationItem[]> {
    try {
      const where = category ? { category } : {};
      const configs = await this.prisma.systemConfiguration.findMany({ where });

      return configs.map((config) => ({
        key: config.key,
        value: config.isEncrypted ? '[ENCRYPTED]' : config.value,
        description: config.description || undefined,
        category: config.category as any,
        isEncrypted: config.isEncrypted,
        isPublic: config.isPublic,
      }));
    } catch (error) {
      this.logger.error('Failed to get all configurations', error);
      return [];
    }
  }

  async deleteConfiguration(key: string): Promise<void> {
    try {
      await this.prisma.systemConfiguration.delete({
        where: { key },
      });
      this.logger.log(`Configuration deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete configuration: ${key}`, error);
      throw error;
    }
  }

  // Helper methods for common configurations
  async getApiBaseUrl(): Promise<string> {
    return (
      (await this.getConfiguration('API_BASE_URL')) || 'http://localhost:4000'
    );
  }

  async getFrontendUrl(): Promise<string> {
    return (
      (await this.getConfiguration('FRONTEND_URL')) || 'http://localhost:5000'
    );
  }

  async getJwtSecret(): Promise<string> {
    const secret = await this.getConfiguration('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }
    return secret;
  }

  async getAiServiceUrl(): Promise<string> {
    return (
      (await this.getConfiguration('AI_SERVICE_URL')) || 'http://localhost:5000'
    );
  }

  async getEmailServiceUrl(): Promise<string> {
    return (await this.getConfiguration('EMAIL_SERVICE_URL')) || '';
  }

  // Initialize default configurations
  async initializeDefaultConfigurations(): Promise<void> {
    const defaultConfigs: Array<ConfigurationItem & { value: string }> = [
      {
        key: 'JWT_SECRET',
        value: crypto.randomBytes(32).toString('hex'),
        description: 'Secret key for JWT token signing',
        category: 'security',
        isEncrypted: true,
        isPublic: false,
      },
      {
        key: 'API_BASE_URL',
        value: 'http://localhost:4000',
        description: 'Base URL for the API server',
        category: 'api',
        isEncrypted: false,
        isPublic: true,
      },
      {
        key: 'FRONTEND_URL',
        value: 'http://localhost:5000',
        description: 'URL for the frontend application',
        category: 'api',
        isEncrypted: false,
        isPublic: true,
      },
      {
        key: 'AI_SERVICE_URL',
        value: 'http://localhost:5000',
        description: 'URL for AI/ML services',
        category: 'external_services',
        isEncrypted: false,
        isPublic: false,
      },
      {
        key: 'EMAIL_SERVICE_URL',
        value: '',
        description: 'URL for email service',
        category: 'email',
        isEncrypted: false,
        isPublic: false,
      },
      {
        key: 'CORS_ORIGINS',
        value: 'http://localhost:5000,http://localhost:3000',
        description: 'Comma-separated list of allowed CORS origins',
        category: 'api',
        isEncrypted: false,
        isPublic: false,
      },
    ];

    for (const config of defaultConfigs) {
      const existing = await this.getConfiguration(config.key);
      if (!existing) {
        await this.setConfiguration(config.key, config.value, {
          description: config.description,
          category: config.category,
          isEncrypted: config.isEncrypted,
          isPublic: config.isPublic,
        });
      }
    }
  }
}
