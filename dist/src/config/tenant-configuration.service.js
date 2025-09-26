"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TenantConfigurationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantConfigurationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const crypto = require("crypto");
let TenantConfigurationService = TenantConfigurationService_1 = class TenantConfigurationService {
    prisma;
    logger = new common_1.Logger(TenantConfigurationService_1.name);
    encryptionKey = process.env.CONFIG_ENCRYPTION_KEY ||
        'default-encryption-key-change-in-production';
    constructor(prisma) {
        this.prisma = prisma;
    }
    encryptValue(value) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.slice(0, 32)), iv);
        let encrypted = cipher.update(value, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }
    decryptValue(encryptedValue) {
        const [ivHex, encrypted] = encryptedValue.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.slice(0, 32)), iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    async getTenantConfiguration(tenantId, key) {
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
        }
        catch (error) {
            this.logger.error(`Failed to get tenant configuration for key: ${key}, tenant: ${tenantId}`, error);
            return null;
        }
    }
    async setTenantConfiguration(tenantId, key, value, options = {}) {
        try {
            const { description = '', category = 'general', isEncrypted = false, isPublic = false, } = options;
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
            this.logger.log(`Tenant configuration updated: ${key} for tenant: ${tenantId}`);
        }
        catch (error) {
            this.logger.error(`Failed to set tenant configuration for key: ${key}, tenant: ${tenantId}`, error);
            throw error;
        }
    }
    async getAllTenantConfigurations(tenantId, category) {
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
                category: config.category,
                isEncrypted: config.isEncrypted,
                isPublic: config.isPublic,
            }));
        }
        catch (error) {
            this.logger.error(`Failed to get all tenant configurations for tenant: ${tenantId}`, error);
            return [];
        }
    }
    async deleteTenantConfiguration(tenantId, key) {
        try {
            await this.prisma.tenantConfiguration.delete({
                where: {
                    tenantId_key: {
                        tenantId,
                        key,
                    },
                },
            });
            this.logger.log(`Tenant configuration deleted: ${key} for tenant: ${tenantId}`);
        }
        catch (error) {
            this.logger.error(`Failed to delete tenant configuration for key: ${key}, tenant: ${tenantId}`, error);
            throw error;
        }
    }
    async getStripeSecretKey(tenantId) {
        return this.getTenantConfiguration(tenantId, 'STRIPE_SECRET_KEY');
    }
    async getStripePublishableKey(tenantId) {
        return this.getTenantConfiguration(tenantId, 'STRIPE_PUBLISHABLE_KEY');
    }
    async getStripeWebhookSecret(tenantId) {
        return this.getTenantConfiguration(tenantId, 'STRIPE_WEBHOOK_SECRET');
    }
    async setStripeSecretKey(tenantId, value) {
        await this.setTenantConfiguration(tenantId, 'STRIPE_SECRET_KEY', value, {
            description: 'Stripe Secret Key for payment processing',
            category: 'stripe',
            isEncrypted: true,
            isPublic: false,
        });
    }
    async setStripePublishableKey(tenantId, value) {
        await this.setTenantConfiguration(tenantId, 'STRIPE_PUBLISHABLE_KEY', value, {
            description: 'Stripe Publishable Key for frontend integration',
            category: 'stripe',
            isEncrypted: false,
            isPublic: true,
        });
    }
    async setStripeWebhookSecret(tenantId, value) {
        await this.setTenantConfiguration(tenantId, 'STRIPE_WEBHOOK_SECRET', value, {
            description: 'Stripe Webhook Secret for webhook verification',
            category: 'stripe',
            isEncrypted: true,
            isPublic: false,
        });
    }
    async getStripePriceId(tenantId, planName) {
        const key = `STRIPE_${planName.toUpperCase()}_PRICE_ID`;
        return this.getTenantConfiguration(tenantId, key);
    }
    async setStripePriceId(tenantId, planName, priceId) {
        const key = `STRIPE_${planName.toUpperCase()}_PRICE_ID`;
        await this.setTenantConfiguration(tenantId, key, priceId, {
            description: `Stripe Price ID for ${planName} plan`,
            category: 'stripe',
            isEncrypted: false,
            isPublic: true,
        });
    }
    async isStripeConfigured(tenantId) {
        const secretKey = await this.getStripeSecretKey(tenantId);
        const publishableKey = await this.getStripePublishableKey(tenantId);
        return !!(secretKey && publishableKey);
    }
};
exports.TenantConfigurationService = TenantConfigurationService;
exports.TenantConfigurationService = TenantConfigurationService = TenantConfigurationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TenantConfigurationService);
//# sourceMappingURL=tenant-configuration.service.js.map