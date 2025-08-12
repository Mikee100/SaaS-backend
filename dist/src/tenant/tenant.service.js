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
const bcrypt = require("bcrypt");
let TenantService = TenantService_1 = class TenantService {
    prisma;
    userService;
    logger = new common_1.Logger(TenantService_1.name);
    constructor(prisma, userService) {
        this.prisma = prisma;
        this.userService = userService;
    }
    async createTenant(data) {
        console.log('[TenantService] createTenant called with:', JSON.stringify(data));
        const requiredFields = [
            { key: 'name', label: 'Business Name' },
            { key: 'businessType', label: 'Business Type' },
            { key: 'contactEmail', label: 'Contact Email' },
            { key: 'ownerName', label: 'Owner Name' },
            { key: 'ownerEmail', label: 'Owner Email' },
            { key: 'ownerPassword', label: 'Owner Password' },
        ];
        const missingFields = requiredFields
            .filter(({ key }) => !data[key])
            .map(({ label }) => label);
        if (missingFields.length > 0) {
            const errorMessage = `Missing required fields: ${missingFields.join(', ')}`;
            this.logger.error(`Failed to create tenant: ${errorMessage}`, {
                receivedData: Object.keys(data),
                missingFields,
                timestamp: new Date().toISOString(),
            });
            console.error('[TenantService] Validation failed:', errorMessage);
            throw new common_1.BadRequestException(errorMessage);
        }
        const loggableData = { ...data };
        if (loggableData.ownerPassword) {
            loggableData.ownerPassword = '***';
        }
        this.logger.debug('Creating tenant with data:', {
            ...loggableData,
            timestamp: new Date().toISOString(),
        });
        console.log('[TenantService] Creating tenant with data:', loggableData);
        const validTenantFields = [
            'name', 'businessType', 'contactEmail', 'contactPhone',
            'businessCategory', 'businessSubcategory', 'primaryProducts', 'secondaryProducts',
            'businessDescription', 'address', 'city', 'state', 'country', 'postalCode',
            'latitude', 'longitude', 'foundedYear', 'employeeCount', 'annualRevenue',
            'businessHours', 'website', 'socialMedia', 'kraPin', 'vatNumber', 'etimsQrUrl',
            'businessLicense', 'taxId', 'currency', 'timezone', 'invoiceFooter', 'logoUrl',
            'favicon', 'receiptLogo', 'watermark', 'primaryColor', 'secondaryColor',
            'customDomain', 'whiteLabel', 'apiKey', 'webhookUrl', 'rateLimit', 'stripeCustomerId'
        ];
        const createData = {};
        for (const key of validTenantFields) {
            if (data[key] !== undefined && data[key] !== null) {
                createData[key] = data[key];
            }
        }
        return await this.prisma.$transaction(async (prisma) => {
            try {
                this.logger.debug('Creating tenant with prisma data:', {
                    tenantData: createData,
                    timestamp: new Date().toISOString(),
                });
                console.log('[TenantService] Creating tenant in DB with:', createData);
                const tenant = await prisma.tenant.create({
                    data: createData
                });
                console.log('[TenantService] Tenant created:', tenant);
                this.logger.debug('Tenant created successfully, creating owner user', {
                    tenantId: tenant.id,
                    ownerEmail: data.ownerEmail,
                    timestamp: new Date().toISOString(),
                });
                const hashedPassword = await bcrypt.hash(data.ownerPassword, 10);
                const ownerUser = await this.userService.createUser({
                    name: data.ownerName,
                    email: data.ownerEmail,
                    password: hashedPassword,
                    role: data.ownerRole || 'admin',
                    tenantId: tenant.id,
                });
                console.log('[TenantService] Owner user created:', ownerUser);
                this.logger.debug('Owner user created successfully', {
                    tenantId: tenant.id,
                    ownerEmail: data.ownerEmail,
                    timestamp: new Date().toISOString(),
                });
                return tenant;
            }
            catch (error) {
                this.logger.error('Error in tenant creation transaction:', {
                    error: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString(),
                });
                console.error('[TenantService] Error in transaction:', error);
                throw new common_1.BadRequestException(error.message || 'Failed to create tenant and owner user', {
                    cause: error,
                    description: error.response?.message || error.toString(),
                });
            }
        });
    }
    async getAllTenants() {
        return this.prisma.tenant.findMany();
    }
    async getTenantById(tenantId) {
        return this.prisma.tenant.findUnique({
            where: { id: tenantId }
        });
    }
    async getTenant(tenantId) {
        return this.prisma.tenant.findUnique({
            where: { id: tenantId }
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
            'name', 'businessType', 'contactEmail', 'contactPhone',
            'businessCategory', 'businessSubcategory', 'primaryProducts', 'secondaryProducts',
            'businessDescription', 'address', 'city', 'state', 'country', 'postalCode',
            'latitude', 'longitude', 'foundedYear', 'employeeCount', 'annualRevenue',
            'businessHours', 'website', 'socialMedia', 'kraPin', 'vatNumber', 'etimsQrUrl',
            'businessLicense', 'taxId', 'currency', 'timezone', 'invoiceFooter', 'logoUrl',
            'favicon', 'receiptLogo', 'watermark', 'primaryColor', 'secondaryColor',
            'customDomain', 'whiteLabel', 'apiKey', 'webhookUrl', 'rateLimit', 'stripeCustomerId'
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
    async createOwnerUser(data) {
        try {
            const hashedPassword = await bcrypt.hash(data.password, 10);
            return await this.userService.createUser({
                name: data.name,
                email: data.email,
                password: hashedPassword,
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
        user_service_1.UserService])
], TenantService);
//# sourceMappingURL=tenant.service.js.map