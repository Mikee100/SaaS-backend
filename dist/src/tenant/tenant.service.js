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
var TenantService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const user_service_1 = require("../user/user.service");
const branch_service_1 = require("../branch/branch.service");
let TenantService = TenantService_1 = class TenantService {
    prisma;
    userService;
    branchService;
    logger = new common_1.Logger(TenantService_1.name);
    constructor(prisma, userService, branchService) {
        this.prisma = prisma;
        this.userService = userService;
        this.branchService = branchService;
    }
    async createTenant(data) {
        const allowedFields = [
            'name',
            'businessType',
            'contactEmail',
            'contactPhone',
            'businessCategory',
            'businessSubcategory',
            'primaryProducts',
            'secondaryProducts',
            'businessDescription',
            'address',
            'city',
            'state',
            'country',
            'postalCode',
            'latitude',
            'longitude',
            'foundedYear',
            'employeeCount',
            'annualRevenue',
            'businessHours',
            'website',
            'socialMedia',
            'kraPin',
            'vatNumber',
            'etimsQrUrl',
            'businessLicense',
            'taxId',
            'currency',
            'timezone',
            'invoiceFooter',
            'credits',
            'logoUrl',
            'loginLogoUrl',
            'favicon',
            'receiptLogo',
            'watermark',
            'dashboardLogoUrl',
            'emailLogoUrl',
            'mobileLogoUrl',
            'logoSettings',
            'primaryColor',
            'secondaryColor',
            'customDomain',
            'whiteLabel',
            'apiKey',
            'webhookUrl',
            'rateLimit',
            'customIntegrations',
            'ssoEnabled',
            'auditLogsEnabled',
            'backupRestore',
            'stripeCustomerId',
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
        return this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });
    }
    async getTenant(tenantId) {
        return this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });
    }
    async updateTenant(tenantId, dto) {
        const existingTenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });
        if (!existingTenant) {
            throw new common_1.NotFoundException('Tenant not found');
        }
        const updateData = {};
        const validTenantFields = [
            'name',
            'businessType',
            'contactEmail',
            'contactPhone',
            'businessCategory',
            'businessSubcategory',
            'primaryProducts',
            'secondaryProducts',
            'businessDescription',
            'address',
            'city',
            'state',
            'country',
            'postalCode',
            'latitude',
            'longitude',
            'foundedYear',
            'employeeCount',
            'annualRevenue',
            'businessHours',
            'website',
            'socialMedia',
            'kraPin',
            'vatNumber',
            'etimsQrUrl',
            'businessLicense',
            'taxId',
            'currency',
            'timezone',
            'invoiceFooter',
            'logoUrl',
            'favicon',
            'receiptLogo',
            'watermark',
            'primaryColor',
            'secondaryColor',
            'customDomain',
            'whiteLabel',
            'apiKey',
            'webhookUrl',
            'rateLimit',
            'stripeCustomerId',
        ];
        for (const key of validTenantFields) {
            if (dto[key] !== undefined && dto[key] !== null) {
                updateData[key] = dto[key];
            }
        }
        const updatedTenant = await this.prisma.tenant.update({
            where: { id: tenantId },
            data: updateData,
        });
        return updatedTenant;
    }
    async createTenantWithOwner(tenantData) {
        return this.prisma.$transaction(async (prisma) => {
            const tenant = await this.createTenant(tenantData);
            const branchName = tenantData.branchName || 'Main Branch';
            const mainBranch = await this.branchService.createBranch({
                name: branchName,
                email: tenantData.contactEmail,
                phone: tenantData.contactPhone,
                isMainBranch: true,
                tenantId: tenant.id,
            });
            const ownerUser = await this.userService.createUser({
                name: tenantData.owner.name,
                email: tenantData.owner.email,
                password: tenantData.owner.password,
                tenantId: tenant.id,
                branchId: mainBranch.id,
                role: 'owner',
            });
            return {
                tenant,
                branch: mainBranch,
                user: {
                    id: ownerUser.id,
                    name: ownerUser.name,
                    email: ownerUser.email,
                },
            };
        });
    }
    async createOwnerUser(data) {
        try {
            return await this.userService.createUser({
                name: data.name,
                email: data.email,
                password: data.password,
                tenantId: data.tenantId,
                role: data.role || 'admin',
            });
        }
        catch (error) {
            this.logger.error(`Error creating owner user for tenant ${data.tenantId}:`, error);
            throw new common_1.BadRequestException('Failed to create owner user');
        }
    }
};
exports.TenantService = TenantService;
exports.TenantService = TenantService = TenantService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        user_service_1.UserService,
        branch_service_1.BranchService])
], TenantService);
//# sourceMappingURL=tenant.service.js.map