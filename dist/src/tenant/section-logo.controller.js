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
exports.SectionLogoController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path = require("path");
const section_logo_service_1 = require("./section-logo.service");
let SectionLogoController = class SectionLogoController {
    sectionLogoService;
    constructor(sectionLogoService) {
        this.sectionLogoService = sectionLogoService;
    }
    async getAllSectionLogos(req) {
        const tenantId = req.user.tenantId;
        return this.sectionLogoService.getAllSectionLogos(tenantId);
    }
    async getSectionLogo(req, section) {
        const tenantId = req.user.tenantId;
        let logo = await this.sectionLogoService.getSectionLogo(tenantId, section);
        if (!logo || !logo.url) {
            logo = {
                url: '/uploads/section-logos/default-logo.png',
                altText: `${section} logo`,
                width: 120,
                height: 120,
            };
        }
        return { sectionLogos: { [section]: logo } };
    }
    async uploadSectionLogo(req, file, section, body) {
        if (!file) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        const logoUrl = `/uploads/section-logos/${file.filename}`;
        const tenantId = req.user.tenantId;
        const config = {
            url: logoUrl,
            width: body.width ? parseInt(body.width, 10) : undefined,
            height: body.height ? parseInt(body.height, 10) : undefined,
            altText: body.altText,
        };
        return this.sectionLogoService.updateSectionLogo(tenantId, section, config);
    }
    async updateSectionLogoConfig(req, section, config) {
        const tenantId = req.user.tenantId;
        return this.sectionLogoService.updateSectionLogoConfig(tenantId, section, config);
    }
    async removeSectionLogo(req, section) {
        const tenantId = req.user.tenantId;
        const success = await this.sectionLogoService.removeSectionLogo(tenantId, section);
        return { success };
    }
    async validateSectionLogoConfig(req) {
        const tenantId = req.user.tenantId;
        return this.sectionLogoService.validateSectionLogoConfig(tenantId);
    }
};
exports.SectionLogoController = SectionLogoController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SectionLogoController.prototype, "getAllSectionLogos", null);
__decorate([
    (0, common_1.Get)(':section'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('section')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SectionLogoController.prototype, "getSectionLogo", null);
__decorate([
    (0, common_1.Post)('upload/:section'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: './uploads/section-logos',
            filename: (req, file, cb) => {
                const ext = path.extname(file.originalname);
                const name = `${req.user.tenantId}_${req.params.section}${ext}`;
                cb(null, name);
            },
        }),
        fileFilter: (req, file, cb) => {
            const allowedMimes = [
                'image/jpeg',
                'image/jpg',
                'image/png',
                'image/svg+xml',
            ];
            if (!allowedMimes.includes(file.mimetype)) {
                return cb(new Error('Only image files (JPEG, PNG, SVG) are allowed!'), false);
            }
            if (file.size > 2 * 1024 * 1024) {
                return cb(new Error('File size must be less than 2MB!'), false);
            }
            cb(null, true);
        },
        limits: { fileSize: 2 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Param)('section')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, Object]),
    __metadata("design:returntype", Promise)
], SectionLogoController.prototype, "uploadSectionLogo", null);
__decorate([
    (0, common_1.Put)(':section'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('section')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], SectionLogoController.prototype, "updateSectionLogoConfig", null);
__decorate([
    (0, common_1.Delete)(':section'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('section')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SectionLogoController.prototype, "removeSectionLogo", null);
__decorate([
    (0, common_1.Get)('config/validation'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SectionLogoController.prototype, "validateSectionLogoConfig", null);
exports.SectionLogoController = SectionLogoController = __decorate([
    (0, common_1.Controller)('api/tenant/section-logos'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [section_logo_service_1.SectionLogoService])
], SectionLogoController);
//# sourceMappingURL=section-logo.controller.js.map