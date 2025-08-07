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
const user_service_1 = require("../user/user.service");
let TenantService = class TenantService {
    prisma;
    userService;
    constructor(prisma, userService) {
        this.prisma = prisma;
        this.userService = userService;
    }
    async createTenant(data) {
        const defaultTenantData = {
            currency: 'KES',
            timezone: 'Africa/Nairobi',
            whiteLabel: false,
            customIntegrations: false,
            ssoEnabled: false,
            auditLogs: false,
            backupRestore: false,
            ...data
        };
        return this.prisma.tenant.create({
            data: defaultTenantData
        });
    }
    async getAllTenants() {
        return this.prisma.tenant.findMany();
    }
    async getTenantById(tenantId) {
        return this.prisma.tenant.findUnique({ where: { id: tenantId } });
    }
    async getTenant(tenantId) {
        return this.prisma.tenant.findUnique({ where: { id: tenantId } });
    }
    async updateTenant(tenantId, dto) {
        const allowedFields = [
            'name', 'businessType', 'contactEmail', 'contactPhone',
            'businessCategory', 'businessSubcategory', 'primaryProducts', 'secondaryProducts', 'businessDescription',
            'address', 'city', 'state', 'country', 'postalCode', 'latitude', 'longitude',
            'foundedYear', 'employeeCount', 'annualRevenue', 'businessHours', 'website', 'socialMedia',
            'kraPin', 'vatNumber', 'etimsQrUrl', 'businessLicense', 'taxId',
            'currency', 'timezone', 'invoiceFooter', 'logoUrl',
            'primaryColor', 'secondaryColor', 'customDomain', 'whiteLabel',
            'apiKey', 'webhookUrl', 'rateLimit', 'customIntegrations',
            'ssoEnabled', 'auditLogs', 'backupRestore'
        ];
        const data = {};
        for (const key of allowedFields) {
            if (dto[key] !== undefined) {
                if (key === 'foundedYear' && dto[key] !== null) {
                    data[key] = parseInt(dto[key], 10);
                }
                else if (key === 'latitude' && dto[key] !== null) {
                    data[key] = parseFloat(dto[key]);
                }
                else if (key === 'longitude' && dto[key] !== null) {
                    data[key] = parseFloat(dto[key]);
                }
                else if (key === 'rateLimit' && dto[key] !== null) {
                    data[key] = parseInt(dto[key], 10);
                }
                else {
                    data[key] = dto[key];
                }
            }
        }
        return this.prisma.tenant.update({ where: { id: tenantId }, data });
    }
    async createOwnerUser(data) {
        return this.userService.createUser({
            name: data.name,
            email: data.email,
            password: data.password,
            role: 'owner',
            tenantId: data.tenantId,
        });
    }
};
exports.TenantService = TenantService;
exports.TenantService = TenantService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, user_service_1.UserService])
], TenantService);
//# sourceMappingURL=tenant.service.js.map