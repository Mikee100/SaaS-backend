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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantConfigurationController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const permissions_guard_1 = require("../auth/permissions.guard");
const trial_guard_1 = require("../auth/trial.guard");
const tenant_configuration_service_1 = require("../config/tenant-configuration.service");
let TenantConfigurationController = class TenantConfigurationController {
    tenantConfigurationService;
    constructor(tenantConfigurationService) {
        this.tenantConfigurationService = tenantConfigurationService;
    }
    async getAllConfigurations(req) {
        const tenantId = req.user.tenantId;
        return this.tenantConfigurationService.getAllTenantConfigurations(tenantId);
    }
    async getConfigurationsByCategory(category, req) {
        const tenantId = req.user.tenantId;
        return this.tenantConfigurationService.getAllTenantConfigurations(tenantId, category);
    }
    async getConfiguration(key, req) {
        const tenantId = req.user.tenantId;
        const value = await this.tenantConfigurationService.getTenantConfiguration(tenantId, key);
        return { key, value };
    }
    async createConfiguration(dto, req) {
        const tenantId = req.user.tenantId;
        await this.tenantConfigurationService.setTenantConfiguration(tenantId, dto.key, dto.value, {
            description: dto.description,
            category: dto.category,
            isEncrypted: dto.isEncrypted || false,
            isPublic: dto.isPublic || false,
        });
        return { message: 'Configuration created successfully' };
    }
    async updateConfiguration(key, dto, req) {
        const tenantId = req.user.tenantId;
        await this.tenantConfigurationService.setTenantConfiguration(tenantId, key, dto.value, {
            description: dto.description,
            category: dto.category,
            isEncrypted: dto.isEncrypted,
            isPublic: dto.isPublic,
        });
        return { message: 'Configuration updated successfully' };
    }
    async deleteConfiguration(key, req) {
        const tenantId = req.user.tenantId;
        await this.tenantConfigurationService.deleteTenantConfiguration(tenantId, key);
        return { message: 'Configuration deleted successfully' };
    }
    async getStripeStatus(req) {
        const tenantId = req.user.tenantId;
        const isConfigured = await this.tenantConfigurationService.isStripeConfigured(tenantId);
        return { isConfigured };
    }
    async getStripeKeys(req) {
        const tenantId = req.user.tenantId;
        const [secretKey, publishableKey, webhookSecret] = await Promise.all([
            this.tenantConfigurationService.getStripeSecretKey(tenantId),
            this.tenantConfigurationService.getStripePublishableKey(tenantId),
            this.tenantConfigurationService.getStripeWebhookSecret(tenantId),
        ]);
        return {
            secretKey: secretKey ? '[CONFIGURED]' : null,
            publishableKey,
            webhookSecret: webhookSecret ? '[CONFIGURED]' : null,
        };
    }
    async configureStripe(dto, req) {
        const tenantId = req.user.tenantId;
        await Promise.all([
            this.tenantConfigurationService.setStripeSecretKey(tenantId, dto.secretKey),
            this.tenantConfigurationService.setStripePublishableKey(tenantId, dto.publishableKey),
            ...(dto.webhookSecret
                ? [
                    this.tenantConfigurationService.setStripeWebhookSecret(tenantId, dto.webhookSecret),
                ]
                : []),
        ]);
        if (dto.autoCreateProducts) {
            const stripeService = req.app.get('StripeService');
            await stripeService.createStripeProductsAndPrices(tenantId);
        }
        if (dto.prices) {
            const stripeService = req.app.get('StripeService');
            await stripeService.updateStripePrices(tenantId, dto.prices);
        }
        return { message: 'Stripe configuration updated successfully' };
    }
    async getStripePriceIds(req) {
        const tenantId = req.user.tenantId;
        const [basicPriceId, proPriceId, enterprisePriceId] = await Promise.all([
            this.tenantConfigurationService.getStripePriceId(tenantId, 'basic'),
            this.tenantConfigurationService.getStripePriceId(tenantId, 'pro'),
            this.tenantConfigurationService.getStripePriceId(tenantId, 'enterprise'),
        ]);
        return {
            basicPriceId,
            proPriceId,
            enterprisePriceId,
        };
    }
    async createStripeProducts(req) {
        const tenantId = req.user.tenantId;
        const stripeService = req.app.get('StripeService');
        const priceIds = await stripeService.createStripeProductsAndPrices(tenantId);
        return {
            message: 'Stripe products and prices created successfully',
            priceIds,
        };
    }
    async updateStripePrices(dto, req) {
        const tenantId = req.user.tenantId;
        const stripeService = req.app.get('StripeService');
        const priceIds = await stripeService.updateStripePrices(tenantId, dto);
        return {
            message: 'Stripe prices updated successfully',
            priceIds,
        };
    }
};
exports.TenantConfigurationController = TenantConfigurationController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('view_billing'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantConfigurationController.prototype, "getAllConfigurations", null);
__decorate([
    (0, common_1.Get)('category/:category'),
    (0, permissions_decorator_1.Permissions)('view_billing'),
    __param(0, (0, common_1.Param)('category')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TenantConfigurationController.prototype, "getConfigurationsByCategory", null);
__decorate([
    (0, common_1.Get)(':key'),
    (0, permissions_decorator_1.Permissions)('view_billing'),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TenantConfigurationController.prototype, "getConfiguration", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('edit_billing'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TenantConfigurationController.prototype, "createConfiguration", null);
__decorate([
    (0, common_1.Put)(':key'),
    (0, permissions_decorator_1.Permissions)('edit_billing'),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], TenantConfigurationController.prototype, "updateConfiguration", null);
__decorate([
    (0, common_1.Delete)(':key'),
    (0, permissions_decorator_1.Permissions)('edit_billing'),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TenantConfigurationController.prototype, "deleteConfiguration", null);
__decorate([
    (0, common_1.Get)('stripe/status'),
    (0, permissions_decorator_1.Permissions)('view_billing'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantConfigurationController.prototype, "getStripeStatus", null);
__decorate([
    (0, common_1.Get)('stripe/keys'),
    (0, permissions_decorator_1.Permissions)('view_billing'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantConfigurationController.prototype, "getStripeKeys", null);
__decorate([
    (0, common_1.Post)('stripe/configure'),
    (0, permissions_decorator_1.Permissions)('edit_billing'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TenantConfigurationController.prototype, "configureStripe", null);
__decorate([
    (0, common_1.Get)('stripe/price-ids'),
    (0, permissions_decorator_1.Permissions)('view_billing'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantConfigurationController.prototype, "getStripePriceIds", null);
__decorate([
    (0, common_1.Post)('stripe/create-products'),
    (0, permissions_decorator_1.Permissions)('edit_billing'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantConfigurationController.prototype, "createStripeProducts", null);
__decorate([
    (0, common_1.Post)('stripe/update-prices'),
    (0, permissions_decorator_1.Permissions)('edit_billing'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TenantConfigurationController.prototype, "updateStripePrices", null);
exports.TenantConfigurationController = TenantConfigurationController = __decorate([
    (0, common_1.Controller)('tenant/configurations'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard, trial_guard_1.TrialGuard),
    __metadata("design:paramtypes", [tenant_configuration_service_1.TenantConfigurationService])
], TenantConfigurationController);
//# sourceMappingURL=tenant-configuration.controller.js.map