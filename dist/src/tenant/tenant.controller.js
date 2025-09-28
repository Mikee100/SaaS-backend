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
const throttler_1 = require("@nestjs/throttler");
const axios_1 = require("axios");
const registration_dto_1 = require("./dto/registration.dto");
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
    recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;
    constructor(tenantService, userService, logoService) {
        this.tenantService = tenantService;
        this.userService = userService;
        this.logoService = logoService;
    }
    async validateRecaptcha(token) {
        if (!this.recaptchaSecretKey) {
            this.logger.warn('reCAPTCHA secret key not configured');
            return true;
        }
        try {
            const response = await axios_1.default.post('https://www.google.com/recaptcha/api/siteverify', null, {
                params: {
                    secret: this.recaptchaSecretKey,
                    response: token,
                },
            });
            const data = response.data;
            return data.success && data.score >= 0.5;
        }
        catch (error) {
            this.logger.error('reCAPTCHA validation failed:', error);
            return false;
        }
    }
    validateCsrf(csrfToken) {
        return !!csrfToken && csrfToken.length > 10;
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
            'primaryColor',
            'secondaryColor',
            'customDomain',
            'whiteLabel',
            'logoUrl',
            'favicon',
            'receiptLogo',
            'watermark',
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
    async getCsrfToken() {
        const csrfToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        return { csrfToken };
    }
    async createTenant(req, createTenantDto, csrfToken) {
        this.logger.debug('Raw request body:', JSON.stringify(createTenantDto));
        try {
            if (!this.validateCsrf(csrfToken)) {
                throw new common_1.HttpException('Invalid CSRF token', common_1.HttpStatus.FORBIDDEN);
            }
            if (!(await this.validateRecaptcha(createTenantDto.recaptchaToken))) {
                throw new common_1.HttpException('Invalid reCAPTCHA. Please try again.', common_1.HttpStatus.BAD_REQUEST);
            }
            const { name, businessType, contactEmail, branchName, owner, ...otherData } = createTenantDto;
            const result = await this.tenantService.createTenantWithOwner({
                name,
                businessType,
                contactEmail,
                contactPhone: otherData.contactPhone,
                branchName,
                owner: {
                    name: owner.name,
                    email: owner.email,
                    password: owner.password,
                },
                ...otherData
            });
            return {
                success: true,
                data: {
                    tenant: result.tenant,
                    branch: result.branch,
                    user: result.user,
                },
            };
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
            const allowedMimes = [
                'image/jpeg',
                'image/jpg',
                'image/png',
                'image/svg+xml',
                'image/x-icon',
            ];
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
    (0, common_1.Get)('csrf-token'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "getCsrfToken", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(throttler_1.ThrottlerGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)(new common_1.ValidationPipe({ transform: true }))),
    __param(2, (0, common_1.Headers)('x-csrf-token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, registration_dto_1.RegistrationDto, String]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "createTenant", null);
exports.TenantController = TenantController = TenantController_1 = __decorate([
    (0, common_1.Controller)('tenant'),
    (0, common_1.UseGuards)(throttler_1.ThrottlerGuard),
    __metadata("design:paramtypes", [tenant_service_1.TenantService,
        user_service_1.UserService,
        logo_service_1.LogoService])
], TenantController);
//# sourceMappingURL=tenant.controller.js.map