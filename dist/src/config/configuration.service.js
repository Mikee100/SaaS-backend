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
var ConfigurationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const crypto = require("crypto");
let ConfigurationService = ConfigurationService_1 = class ConfigurationService {
    prisma;
    logger = new common_1.Logger(ConfigurationService_1.name);
    encryptionKey = process.env.CONFIG_ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
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
    async getConfiguration(key) {
        try {
            const config = await this.prisma.systemConfiguration.findUnique({
                where: { key },
            });
            if (!config) {
                return null;
            }
            return config.isEncrypted ? this.decryptValue(config.value) : config.value;
        }
        catch (error) {
            this.logger.error(`Failed to get configuration for key: ${key}`, error);
            return null;
        }
    }
    async setConfiguration(key, value, options = {}) {
        try {
            const { description = '', category = 'general', isEncrypted = false, isPublic = false, } = options;
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
                    key,
                    value: finalValue,
                    description,
                    category,
                    isEncrypted,
                    isPublic,
                },
            });
            this.logger.log(`Configuration updated: ${key}`);
        }
        catch (error) {
            this.logger.error(`Failed to set configuration for key: ${key}`, error);
            throw error;
        }
    }
    async getAllConfigurations(category) {
        try {
            const where = category ? { category } : {};
            const configs = await this.prisma.systemConfiguration.findMany({ where });
            return configs.map(config => ({
                key: config.key,
                value: config.isEncrypted ? '[ENCRYPTED]' : config.value,
                description: config.description || undefined,
                category: config.category,
                isEncrypted: config.isEncrypted,
                isPublic: config.isPublic,
            }));
        }
        catch (error) {
            this.logger.error('Failed to get all configurations', error);
            return [];
        }
    }
    async deleteConfiguration(key) {
        try {
            await this.prisma.systemConfiguration.delete({
                where: { key },
            });
            this.logger.log(`Configuration deleted: ${key}`);
        }
        catch (error) {
            this.logger.error(`Failed to delete configuration: ${key}`, error);
            throw error;
        }
    }
    async getApiBaseUrl() {
        return await this.getConfiguration('API_BASE_URL') || 'http://localhost:4000';
    }
    async getFrontendUrl() {
        return await this.getConfiguration('FRONTEND_URL') || 'http://localhost:5000';
    }
    async getJwtSecret() {
        const secret = await this.getConfiguration('JWT_SECRET');
        if (!secret) {
            throw new Error('JWT_SECRET not configured');
        }
        return secret;
    }
    async getAiServiceUrl() {
        return await this.getConfiguration('AI_SERVICE_URL') || 'http://localhost:5000';
    }
    async getEmailServiceUrl() {
        return await this.getConfiguration('EMAIL_SERVICE_URL') || '';
    }
    async initializeDefaultConfigurations() {
        const defaultConfigs = [
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
};
exports.ConfigurationService = ConfigurationService;
exports.ConfigurationService = ConfigurationService = ConfigurationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ConfigurationService);
//# sourceMappingURL=configuration.service.js.map