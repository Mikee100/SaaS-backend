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
exports.TenantController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path = require("path");
const tenant_service_1 = require("./tenant.service");
let TenantController = class TenantController {
    tenantService;
    constructor(tenantService) {
        this.tenantService = tenantService;
    }
    async getMyTenant(req) {
        return this.tenantService.getTenant(req.user.tenantId);
    }
    async updateMyTenant(req, dto) {
        const tenantId = req.user.tenantId;
        return this.tenantService.updateTenant(tenantId, dto);
    }
    async uploadLogo(req, file) {
        if (!file)
            throw new Error('No file uploaded');
        const logoUrl = `/uploads/logos/${file.filename}`;
        await this.tenantService.updateTenant(req.user.tenantId, { logoUrl });
        return { logoUrl };
    }
    async getBrandingSettings(req) {
        const tenant = await this.tenantService.getTenant(req.user.tenantId);
        return {
            logoUrl: tenant.logoUrl,
            primaryColor: tenant.primaryColor || '#3B82F6',
            secondaryColor: tenant.secondaryColor || '#1F2937',
            customDomain: tenant.customDomain,
            whiteLabel: tenant.whiteLabel || false,
        };
    }
    async updateBrandingSettings(req, branding) {
        const tenantId = req.user.tenantId;
        return this.tenantService.updateTenant(tenantId, {
            primaryColor: branding.primaryColor,
            secondaryColor: branding.secondaryColor,
            customDomain: branding.customDomain,
            whiteLabel: branding.whiteLabel,
        });
    }
    async getApiSettings(req) {
        const tenant = await this.tenantService.getTenant(req.user.tenantId);
        return {
            apiKey: tenant.apiKey,
            webhookUrl: tenant.webhookUrl,
            rateLimit: tenant.rateLimit || 1000,
            customIntegrations: tenant.customIntegrations || false,
        };
    }
    async updateApiSettings(req, apiSettings) {
        const tenantId = req.user.tenantId;
        return this.tenantService.updateTenant(tenantId, {
            webhookUrl: apiSettings.webhookUrl,
            rateLimit: apiSettings.rateLimit,
            customIntegrations: apiSettings.customIntegrations,
        });
    }
    async generateApiKey(req) {
        const tenantId = req.user.tenantId;
        const apiKey = `sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
        await this.tenantService.updateTenant(tenantId, { apiKey });
        return { apiKey };
    }
    async createTenant(dto) {
        return this.tenantService.createTenant(dto);
    }
};
exports.TenantController = TenantController;
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "getMyTenant", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Put)('me'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "updateMyTenant", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('logo'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: './uploads/logos',
            filename: (req, file, cb) => {
                const ext = path.extname(file.originalname);
                const user = req.user;
                const name = `${user.tenantId}${ext}`;
                cb(null, name);
            },
        }),
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.startsWith('image/')) {
                return cb(new Error('Only image files are allowed!'), false);
            }
            cb(null, true);
        },
        limits: { fileSize: 2 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "uploadLogo", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('branding'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "getBrandingSettings", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Put)('branding'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "updateBrandingSettings", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('api-settings'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "getApiSettings", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Put)('api-settings'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "updateApiSettings", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('generate-api-key'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "generateApiKey", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "createTenant", null);
exports.TenantController = TenantController = __decorate([
    (0, common_1.Controller)('tenant'),
    __metadata("design:paramtypes", [tenant_service_1.TenantService])
], TenantController);
//# sourceMappingURL=tenant.controller.js.map