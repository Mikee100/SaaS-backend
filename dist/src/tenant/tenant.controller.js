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
var TenantController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path = require("path");
const tenant_service_1 = require("./tenant.service");
const common_2 = require("@nestjs/common");
const user_service_1 = require("../user/user.service");
const logo_service_1 = require("./logo.service");
let TenantController = TenantController_1 = class TenantController {
    tenantService;
    userService;
    logoService;
    logger = new common_2.Logger(TenantController_1.name);
    constructor(tenantService, userService, logoService) {
        this.tenantService = tenantService;
        this.userService = userService;
        this.logoService = logoService;
    }
    async getMyTenant(req) {
        const tenantId = req.user.tenantId;
        return this.tenantService.getTenantById(tenantId);
    }
    async updateMyTenant(req, dto) {
        const tenantId = req.user.tenantId;
        return this.tenantService.updateTenant(tenantId, dto);
    }
    async uploadLogo(req, file, body) {
        if (!file)
            throw new Error('No file uploaded');
        const logoType = body.type || 'main';
        const logoUrl = `/uploads/logos/${file.filename}`;
        const updateData = {};
        switch (logoType) {
            case 'main':
                updateData.logoUrl = logoUrl;
                break;
            case 'favicon':
                updateData.favicon = logoUrl;
                break;
            case 'receiptLogo':
                updateData.receiptLogo = logoUrl;
                break;
            case 'etimsQrCode':
                updateData.etimsQrUrl = logoUrl;
                break;
            case 'watermark':
                updateData.watermark = logoUrl;
                break;
            default:
                updateData.logoUrl = logoUrl;
        }
        await this.tenantService.updateTenant(req.user.tenantId, updateData);
        return { logoUrl, type: logoType };
    }
    async getLogoCompliance(req) {
        const tenantId = req.user.tenantId;
        return this.logoService.enforceLogoCompliance(tenantId);
    }
    async getLogoStatistics(req) {
        const tenantId = req.user.tenantId;
        return this.logoService.getLogoStatistics(tenantId);
    }
    async updateBranding(req, dto) {
        const tenantId = req.user.tenantId;
        const allowedFields = [
            'primaryColor', 'secondaryColor', 'customDomain', 'whiteLabel',
            'logoUrl', 'favicon', 'receiptLogo', 'watermark'
        ];
        const data = {};
        for (const key of allowedFields) {
            if (dto[key] !== undefined) {
                data[key] = dto[key];
            }
        }
        return this.tenantService.updateTenant(tenantId, data);
    }
    async getApiSettings(req) {
        const tenant = await this.tenantService.getTenantById(req.user.tenantId);
        if (!tenant) {
            throw new Error('Tenant not found');
        }
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
        });
    }
    async generateApiKey(req) {
        const tenantId = req.user.tenantId;
        const apiKey = `sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
        await this.tenantService.updateTenant(tenantId, { apiKey });
        return { apiKey };
    }
    async createTenant(createTenantDto) {
        this.logger.debug('Raw request body:', JSON.stringify(createTenantDto));
        try {
            const { ownerName, ownerEmail, ownerPassword, ownerRole = 'owner', ...tenantData } = createTenantDto;
            if (!ownerName || !ownerEmail || !ownerPassword) {
                throw new common_1.BadRequestException('Missing required owner information');
            }
            const tenant = await this.tenantService.createTenant(tenantData);
            if (this.userService) {
                const ownerUser = await this.userService.createUser({
                    name: ownerName,
                    email: ownerEmail,
                    password: ownerPassword,
                    role: ownerRole,
                    tenantId: tenant.id,
                });
                return { tenant, ownerUser };
            }
            return { tenant };
        }
        catch (error) {
            this.logger.error('Error creating tenant:', error);
            console.error('[TenantController] Error during tenant registration:', error);
            throw error;
        }
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
                const logoType = req.body.type || 'main';
                const name = `${user.tenantId}_${logoType}${ext}`;
                cb(null, name);
            },
        }),
        fileFilter: (req, file, cb) => {
            const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/x-icon'];
            if (!allowedMimes.includes(file.mimetype)) {
                return cb(new Error('Only image files (JPEG, PNG, SVG, ICO) are allowed!'), false);
            }
            if (file.size > 5 * 1024 * 1024) {
                return cb(new Error('File size must be less than 5MB!'), false);
            }
            cb(null, true);
        },
        limits: { fileSize: 5 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "uploadLogo", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('logo/compliance'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "getLogoCompliance", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('logo/statistics'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "getLogoStatistics", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Put)('branding'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "updateBranding", null);
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
exports.TenantController = TenantController = TenantController_1 = __decorate([
    (0, common_1.Controller)('tenant'),
    __metadata("design:paramtypes", [tenant_service_1.TenantService,
        user_service_1.UserService,
        logo_service_1.LogoService])
], TenantController);
//# sourceMappingURL=tenant.controller.js.map