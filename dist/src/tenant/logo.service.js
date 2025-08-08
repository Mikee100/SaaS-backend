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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogoService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let LogoService = class LogoService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async validateTenantLogos(tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                logoUrl: true,
                etimsQrUrl: true,
                country: true,
            }
        });
        if (!tenant) {
            throw new Error('Tenant not found');
        }
        const requirements = {
            mainLogo: true,
            etimsQrCode: tenant.country === 'Kenya',
            favicon: false,
            receiptLogo: false,
            watermark: false,
        };
        const missing = [];
        if (requirements.mainLogo && !tenant.logoUrl) {
            missing.push('Main Logo');
        }
        if (requirements.etimsQrCode && !tenant.etimsQrUrl) {
            missing.push('KRA eTIMS QR Code');
        }
        const compliance = missing.length === 0;
        return {
            requirements,
            missing,
            compliance
        };
    }
    async getLogoUsage(tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                logoUrl: true,
                etimsQrUrl: true,
            }
        });
        if (!tenant) {
            throw new Error('Tenant not found');
        }
        return {
            mainLogo: tenant.logoUrl,
            favicon: null,
            receiptLogo: null,
            etimsQrCode: tenant.etimsQrUrl,
            watermark: null,
        };
    }
    async enforceLogoCompliance(tenantId) {
        const validation = await this.validateTenantLogos(tenantId);
        const recommendations = [];
        if (!validation.compliance) {
            recommendations.push('Upload required logos to ensure compliance');
        }
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { country: true }
        });
        if (tenant?.country === 'Kenya' && !validation.missing.includes('KRA eTIMS QR Code')) {
            recommendations.push('Consider uploading a KRA eTIMS QR code for tax compliance');
        }
        return {
            compliant: validation.compliance,
            missing: validation.missing,
            recommendations
        };
    }
    async validateLogoFile(file, logoType) {
        const errors = [];
        const warnings = [];
        const maxSizes = {
            main: 2 * 1024 * 1024,
            favicon: 0.5 * 1024 * 1024,
            receiptLogo: 1 * 1024 * 1024,
            etimsQrCode: 1 * 1024 * 1024,
            watermark: 1 * 1024 * 1024,
        };
        const maxSize = maxSizes[logoType] || 2 * 1024 * 1024;
        if (file.size > maxSize) {
            errors.push(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
        }
        const allowedTypes = {
            main: ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'],
            favicon: ['image/x-icon', 'image/png'],
            receiptLogo: ['image/jpeg', 'image/jpg', 'image/png'],
            etimsQrCode: ['image/jpeg', 'image/jpg', 'image/png'],
            watermark: ['image/jpeg', 'image/jpg', 'image/png'],
        };
        const allowedMimes = allowedTypes[logoType] || ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedMimes.includes(file.mimetype)) {
            errors.push(`File type must be one of: ${allowedMimes.join(', ')}`);
        }
        if (logoType === 'etimsQrCode') {
            warnings.push('Ensure this is a valid KRA eTIMS QR code for tax compliance');
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    async getLogoStatistics(tenantId) {
        const logos = await this.getLogoUsage(tenantId);
        const validation = await this.validateTenantLogos(tenantId);
        const totalLogos = Object.values(logos).filter(Boolean).length;
        const requiredLogos = Object.values(validation.requirements).filter(Boolean).length;
        const optionalLogos = totalLogos - requiredLogos;
        const complianceScore = validation.compliance ? 100 : Math.round((requiredLogos - validation.missing.length) / requiredLogos * 100);
        return {
            totalLogos,
            requiredLogos,
            optionalLogos,
            complianceScore
        };
    }
};
exports.LogoService = LogoService;
exports.LogoService = LogoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LogoService);
//# sourceMappingURL=logo.service.js.map