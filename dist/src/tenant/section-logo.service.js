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
var SectionLogoService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SectionLogoService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const logo_service_1 = require("./logo.service");
let SectionLogoService = SectionLogoService_1 = class SectionLogoService {
    prisma;
    logoService;
    logger = new common_1.Logger(SectionLogoService_1.name);
    constructor(prisma, logoService) {
        this.prisma = prisma;
        this.logoService = logoService;
    }
    getDefaultSettings() {
        return {
            sections: {
                login: {
                    logoType: 'loginLogoUrl',
                    enabled: true,
                    dimensions: { width: 200, height: 50 },
                    position: 'center'
                },
                dashboard: {
                    logoType: 'dashboardLogoUrl',
                    enabled: true,
                    dimensions: { width: 180, height: 45 },
                    position: 'left'
                },
                email: {
                    logoType: 'emailLogoUrl',
                    enabled: true,
                    dimensions: { width: 200, height: 50 },
                    position: 'center'
                },
                mobile: {
                    logoType: 'mobileLogoUrl',
                    enabled: true,
                    dimensions: { width: 120, height: 30 },
                    position: 'center'
                },
                receipt: {
                    logoType: 'receiptLogoUrl',
                    enabled: true,
                    dimensions: { width: 200, height: 50 },
                    position: 'center'
                }
            }
        };
    }
    parseLogoSettings(settings) {
        if (!settings)
            return this.getDefaultSettings();
        if (typeof settings === 'string') {
            try {
                return JSON.parse(settings);
            }
            catch (e) {
                this.logger.error('Error parsing logo settings', e);
                return this.getDefaultSettings();
            }
        }
        const defaultSettings = this.getDefaultSettings();
        const result = {
            sections: { ...defaultSettings.sections, ...settings.sections }
        };
        for (const [section, config] of Object.entries(result.sections)) {
            result.sections[section] = {
                ...defaultSettings.sections[section],
                ...config
            };
        }
        return result;
    }
    async getSectionLogoConfig(tenantId, section) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                logoSettings: true,
                logoUrl: true,
                loginLogoUrl: true,
                dashboardLogoUrl: true,
                emailLogoUrl: true,
                mobileLogoUrl: true,
                favicon: true,
                receiptLogo: true,
                watermark: true
            }
        });
        if (!tenant) {
            throw new common_1.NotFoundException(`Tenant with ID ${tenantId} not found`);
        }
        const settings = this.parseLogoSettings(tenant.logoSettings);
        const sectionConfig = settings.sections[section];
        if (!sectionConfig) {
            return null;
        }
        let logoUrl = '';
        switch (sectionConfig.logoType) {
            case 'loginLogoUrl':
                logoUrl = tenant.loginLogoUrl || tenant.logoUrl || '';
                break;
            case 'dashboardLogoUrl':
                logoUrl = tenant.dashboardLogoUrl || tenant.logoUrl || '';
                break;
            case 'emailLogoUrl':
                logoUrl = tenant.emailLogoUrl || tenant.logoUrl || '';
                break;
            case 'mobileLogoUrl':
                logoUrl = tenant.mobileLogoUrl || tenant.logoUrl || '';
                break;
            case 'favicon':
                logoUrl = tenant.favicon || '';
                break;
            case 'receiptLogo':
                logoUrl = tenant.receiptLogo || '';
                break;
            case 'watermark':
                logoUrl = tenant.watermark || '';
                break;
            default:
                logoUrl = tenant.logoUrl || '';
        }
        return {
            section,
            logoType: sectionConfig.logoType,
            logoUrl,
            enabled: sectionConfig.enabled !== false,
            dimensions: sectionConfig.dimensions,
            position: sectionConfig.position
        };
    }
    async updateSectionLogoConfig(tenantId, section, config) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { logoSettings: true }
        });
        if (!tenant) {
            throw new common_1.NotFoundException(`Tenant with ID ${tenantId} not found`);
        }
        const currentSettings = this.parseLogoSettings(tenant.logoSettings);
        const sectionConfig = currentSettings.sections[section] || {
            logoType: 'logoUrl',
            enabled: true
        };
        currentSettings.sections[section] = {
            ...sectionConfig,
            ...config,
            logoType: config.logoType || sectionConfig.logoType,
            enabled: config.enabled !== undefined ? config.enabled : sectionConfig.enabled,
            dimensions: {
                ...(sectionConfig.dimensions || {}),
                ...(config.dimensions || {})
            }
        };
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { logoSettings: currentSettings }
        });
        return this.getSectionLogoConfig(tenantId, section);
    }
    async getSectionLogo(tenantId, section) {
        const config = await this.getSectionLogoConfig(tenantId, section);
        if (!config || !config.enabled) {
            return null;
        }
        const logoUrl = config.logoUrl || '';
        return {
            url: logoUrl,
            width: config.dimensions?.width,
            height: config.dimensions?.height
        };
    }
    async getAllSectionLogos(tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                logoSettings: true,
                logoUrl: true,
                loginLogoUrl: true,
                dashboardLogoUrl: true,
                emailLogoUrl: true,
                mobileLogoUrl: true
            }
        });
        if (!tenant)
            return {};
        const sections = [
            'main', 'favicon', 'receipt', 'watermark', 'login',
            'dashboard', 'email', 'mobile', 'sidebar', 'header'
        ];
        const result = {};
        for (const section of sections) {
            const config = await this.getSectionLogoConfig(tenantId, section);
            if (config) {
                result[section] = config;
            }
        }
        return result;
    }
    async updateSectionLogo(tenantId, sectionName, logo) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { logoSettings: true },
        });
        if (!tenant) {
            throw new common_1.NotFoundException('Tenant not found');
        }
        const currentSettings = this.parseLogoSettings(tenant.logoSettings);
        currentSettings.sections[sectionName] = {
            logoType: 'custom',
            enabled: true,
            customUrl: logo.url,
            dimensions: {
                width: logo.width,
                height: logo.height,
            },
        };
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: {
                logoSettings: currentSettings,
            },
        });
        return currentSettings;
    }
    async removeSectionLogo(tenantId, sectionName) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { logoSettings: true },
        });
        if (!tenant) {
            throw new common_1.NotFoundException('Tenant not found');
        }
        if (!tenant.logoSettings) {
            return false;
        }
        const currentSettings = this.parseLogoSettings(tenant.logoSettings);
        if (!currentSettings.sections || !currentSettings.sections[sectionName]) {
            return false;
        }
        delete currentSettings.sections[sectionName];
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: {
                logoSettings: currentSettings,
            },
        });
        return true;
    }
    getDefaultLogoForSection(tenant, section) {
        const logoMap = {
            'main': 'logoUrl',
            'favicon': 'faviconUrl',
            'receipt': 'receiptLogoUrl',
            'watermark': 'watermarkUrl',
            'login': 'loginLogoUrl',
            'dashboard': 'dashboardLogoUrl',
            'email': 'emailLogoUrl',
            'mobile': 'mobileLogoUrl',
            'sidebar': 'logoUrl',
            'header': 'logoUrl'
        };
        const logoType = logoMap[section] || 'logoUrl';
        const logoUrl = tenant[logoType];
        return {
            section,
            logoType,
            logoUrl: logoUrl || tenant.logoUrl,
            enabled: true
        };
    }
    getLogoUrlByType(tenant, logoType) {
        const logoMap = {
            'main': 'logoUrl',
            'favicon': 'faviconUrl',
            'receipt': 'receiptLogoUrl',
            'watermark': 'watermarkUrl',
            'login': 'loginLogoUrl',
            'dashboard': 'dashboardLogoUrl',
            'email': 'emailLogoUrl',
            'mobile': 'mobileLogoUrl'
        };
        return tenant[logoMap[logoType]];
    }
    async getLogoUsageBySection(tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                logoUrl: true,
                favicon: true,
                receiptLogo: true,
                watermark: true,
                loginLogoUrl: true,
                dashboardLogoUrl: true,
                emailLogoUrl: true,
                mobileLogoUrl: true,
            }
        });
        if (!tenant)
            return {};
        return {
            main: tenant.logoUrl,
            favicon: tenant.favicon,
            receipt: tenant.receiptLogo,
            watermark: tenant.watermark,
            login: tenant.loginLogoUrl,
            dashboard: tenant.dashboardLogoUrl,
            email: tenant.emailLogoUrl,
            mobile: tenant.mobileLogoUrl,
        };
    }
    async validateSectionLogoConfig(tenantId) {
        const sections = await this.getAllSectionLogos(tenantId);
        const missing = [];
        const recommendations = [];
        for (const [section, config] of Object.entries(sections)) {
            if (config.enabled && !config.logoUrl) {
                missing.push(section);
            }
        }
        if (missing.length > 0) {
            recommendations.push(`Upload logos for sections: ${missing.join(', ')}`);
        }
        const compliant = missing.length === 0;
        return {
            compliant,
            missing,
            recommendations
        };
    }
};
exports.SectionLogoService = SectionLogoService;
exports.SectionLogoService = SectionLogoService = SectionLogoService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        logo_service_1.LogoService])
], SectionLogoService);
//# sourceMappingURL=section-logo.service.js.map