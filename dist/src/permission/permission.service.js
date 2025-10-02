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
exports.PermissionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let PermissionService = class PermissionService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAllPermissions() {
        return this.prisma.permission.findMany();
    }
    async createPermission(key, description) {
        const existingArr = await this.prisma.permission.findMany({
            where: { name: { equals: key } },
        });
        const existing = existingArr[0];
        if (existing)
            throw new common_1.BadRequestException('Permission already exists');
        return this.prisma.permission.create({ data: { name: key, description } });
    }
    async getAllRoles(currentUserRole, tenantId) {
        let whereClause = {};
        if (tenantId) {
            whereClause = { tenantId };
        }
        return this.prisma.role.findMany({
            where: whereClause,
            include: {
                permissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });
    }
    async updateRole(name, description) {
        throw new Error('updateRole now requires tenantId');
    }
    async createRole(name, description, tenantId) {
        if (!name) {
            throw new common_1.BadRequestException('Role name is required');
        }
        if (!tenantId) {
            throw new common_1.BadRequestException('Tenant ID is required');
        }
        const existingRole = await this.prisma.role.findFirst({
            where: {
                name,
                tenantId,
            },
        });
        if (existingRole) {
            throw new common_1.BadRequestException('A role with this name already exists for this tenant');
        }
        return this.prisma.role.create({
            data: {
                name,
                description,
                tenantId,
            },
        });
    }
    async getRolePermissions(roleId) {
        return this.prisma.rolePermission.findMany({
            where: { roleId },
            include: {
                permission: true,
                role: true,
            },
        });
    }
    async updateRolePermissions(roleId, permissions) {
        await this.prisma.rolePermission.deleteMany({ where: { roleId } });
        for (const perm of permissions) {
            const permissionArr = await this.prisma.permission.findMany({
                where: { name: { equals: perm.key } },
            });
            const permission = permissionArr[0];
            if (permission) {
                await this.prisma.rolePermission.create({
                    data: { roleId, permissionId: permission.id },
                });
            }
        }
        return this.getRolePermissions(roleId);
    }
};
exports.PermissionService = PermissionService;
exports.PermissionService = PermissionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PermissionService);
//# sourceMappingURL=permission.service.js.map