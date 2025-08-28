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
exports.TenantService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let TenantService = class TenantService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createTenant(data) {
        const allowedFields = [
            'name', 'businessType', 'contactEmail', 'contactPhone',
            'businessCategory', 'businessSubcategory', 'primaryProducts', 'secondaryProducts', 'businessDescription',
            'address', 'city', 'state', 'country', 'postalCode', 'latitude', 'longitude',
            'foundedYear', 'employeeCount', 'annualRevenue', 'businessHours', 'website', 'socialMedia',
            'kraPin', 'vatNumber', 'etimsQrUrl', 'businessLicense', 'taxId',
            'currency', 'timezone', 'invoiceFooter', 'credits', 'logoUrl', 'loginLogoUrl', 'favicon', 'receiptLogo', 'watermark',
            'dashboardLogoUrl', 'emailLogoUrl', 'mobileLogoUrl', 'logoSettings',
            'primaryColor', 'secondaryColor', 'customDomain', 'whiteLabel', 'apiKey', 'webhookUrl', 'rateLimit', 'customIntegrations',
            'ssoEnabled', 'auditLogsEnabled', 'backupRestore', 'stripeCustomerId'
        ];
        const filtered = {};
        for (const key of allowedFields) {
            if (data[key] !== undefined)
                filtered[key] = data[key];
        }
        const tenant = await this.prisma.tenant.create({ data: filtered });
        const tenantConfigurationService = new (require('../config/tenant-configuration.service').TenantConfigurationService)(this.prisma);
        await tenantConfigurationService.setTenantConfiguration(tenant.id, 'stockThreshold', '10', {
            description: 'Default stock threshold',
            category: 'general',
            isEncrypted: false,
            isPublic: true,
        });
        return tenant;
    }
    async getAllTenants() {
        return this.prisma.tenant.findMany();
    }
    async getTenantById(tenantId) {
        return this.prisma.tenant.findUnique({ where: { id: tenantId } });
    }
    async updateTenant(tenantId, dto) {
        const allowedFields = [
            'name', 'businessType', 'contactEmail', 'contactPhone',
            'address', 'currency', 'timezone', 'invoiceFooter', 'logoUrl',
            'kraPin', 'vatNumber', 'etimsQrUrl',
        ];
        const data = {};
        for (const key of allowedFields) {
            if (dto[key] !== undefined)
                data[key] = dto[key];
        }
        return this.prisma.tenant.update({ where: { id: tenantId }, data });
    }
};
exports.TenantService = TenantService;
exports.TenantService = TenantService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TenantService);
//# sourceMappingURL=tenant.service.js.map