import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as crypto from 'crypto';

export interface TenantConfigurationItem {
  key: string;
  value: string;
  description?: string;
  category: 'stripe' | 'payment' | 'billing' | 'general';
  isEncrypted: boolean;
  isPublic: boolean;
}

@Injectable()
export class TenantConfigurationService {
  private readonly logger = new Logger(TenantConfigurationService.name);
  private readonly encryptionKey =
    process.env.CONFIG_ENCRYPTION_KEY ||
    'default-encryption-key-change-in-production';

  constructor(private readonly prisma: PrismaService) {}

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

  async getTenantConfiguration(
    tenantId: string,
    key: string,
  ): Promise<string | null> {
    try {
      const config = await this.prisma.tenantConfiguration.findUnique({
        where: {
          tenantId_key: {
            tenantId,
            key,
          },
        },
      });

      if (!config) {
        return null;
      }

      return config.isEncrypted
        ? this.decryptValue(config.value)
        : config.value;
    } catch (error) {
      this.logger.error(
        `Failed to get tenant configuration for key: ${key}, tenant: ${tenantId}`,
        error,
      );
      return null;
    }
  }

  async setTenantConfiguration(
    tenantId: string,
    key: string,
    value: string,
    options: Partial<TenantConfigurationItem> = {},
  ): Promise<void> {
    try {
      const {
        description = '',
        category = 'general',
        isEncrypted = false,
        isPublic = false,
      } = options;

      const finalValue = isEncrypted ? this.encryptValue(value) : value;

      await this.prisma.tenantConfiguration.upsert({
        where: {
          tenantId_key: {
            tenantId,
            key,
          },
        },
        update: {
          value: finalValue,
          description,
          category,
          isEncrypted,
          isPublic,
          updatedAt: new Date(),
        },
        create: {
          id: `tenant_config_${tenantId}_${key}_${Date.now()}`,
          tenantId,
          key,
          value: finalValue,
          description,
          category,
          isEncrypted,
          isPublic,
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `Tenant configuration updated: ${key} for tenant: ${tenantId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to set tenant configuration for key: ${key}, tenant: ${tenantId}`,
        error,
      );
      throw error;
    }
  }

  async getAllTenantConfigurations(
    tenantId: string,
    category?: string,
  ): Promise<TenantConfigurationItem[]> {
    try {
      const where = {
        tenantId,
        ...(category && { category }),
      };

      const configs = await this.prisma.tenantConfiguration.findMany({ where });

      return configs.map((config) => ({
        key: config.key,
        value: config.isEncrypted ? '[ENCRYPTED]' : config.value,
        description: config.description || undefined,
        category: config.category as any,
        isEncrypted: config.isEncrypted,
        isPublic: config.isPublic,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get all tenant configurations for tenant: ${tenantId}`,
        error,
      );
      return [];
    }
  }

  async deleteTenantConfiguration(
    tenantId: string,
    key: string,
  ): Promise<void> {
    try {
      await this.prisma.tenantConfiguration.delete({
        where: {
          tenantId_key: {
            tenantId,
            key,
          },
        },
      });

      this.logger.log(
        `Tenant configuration deleted: ${key} for tenant: ${tenantId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete tenant configuration for key: ${key}, tenant: ${tenantId}`,
        error,
      );
      throw error;
    }
  }

  // Stripe-specific methods
  async getStripeSecretKey(tenantId: string): Promise<string | null> {
    return this.getTenantConfiguration(tenantId, 'STRIPE_SECRET_KEY');
  }

  async getStripePublishableKey(tenantId: string): Promise<string | null> {
    return this.getTenantConfiguration(tenantId, 'STRIPE_PUBLISHABLE_KEY');
  }

  async getStripeWebhookSecret(tenantId: string): Promise<string | null> {
    return this.getTenantConfiguration(tenantId, 'STRIPE_WEBHOOK_SECRET');
  }

  async setStripeSecretKey(tenantId: string, value: string): Promise<void> {
    await this.setTenantConfiguration(tenantId, 'STRIPE_SECRET_KEY', value, {
      description: 'Stripe Secret Key for payment processing',
      category: 'stripe',
      isEncrypted: true,
      isPublic: false,
    });
  }

  async setStripePublishableKey(
    tenantId: string,
    value: string,
  ): Promise<void> {
    await this.setTenantConfiguration(
      tenantId,
      'STRIPE_PUBLISHABLE_KEY',
      value,
      {
        description: 'Stripe Publishable Key for frontend integration',
        category: 'stripe',
        isEncrypted: false,
        isPublic: true,
      },
    );
  }

  async setStripeWebhookSecret(tenantId: string, value: string): Promise<void> {
    await this.setTenantConfiguration(
      tenantId,
      'STRIPE_WEBHOOK_SECRET',
      value,
      {
        description: 'Stripe Webhook Secret for webhook verification',
        category: 'stripe',
        isEncrypted: true,
        isPublic: false,
      },
    );
  }

  async getStripePriceId(
    tenantId: string,
    planName: string,
  ): Promise<string | null> {
    const key = `STRIPE_${planName.toUpperCase()}_PRICE_ID`;
    return this.getTenantConfiguration(tenantId, key);
  }

  async setStripePriceId(
    tenantId: string,
    planName: string,
    priceId: string,
  ): Promise<void> {
    const key = `STRIPE_${planName.toUpperCase()}_PRICE_ID`;
    await this.setTenantConfiguration(tenantId, key, priceId, {
      description: `Stripe Price ID for ${planName} plan`,
      category: 'stripe',
      isEncrypted: false,
      isPublic: true,
    });
  }

  async isStripeConfigured(tenantId: string): Promise<boolean> {
    const secretKey = await this.getStripeSecretKey(tenantId);
    const publishableKey = await this.getStripePublishableKey(tenantId);
    return !!(secretKey && publishableKey);
  }
}
