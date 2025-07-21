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
        const existing = await this.prisma.permission.findUnique({ where: { key } });
        if (existing)
            throw new common_1.BadRequestException('Permission already exists');
        return this.prisma.permission.create({ data: { key, description } });
    }
    async getAllRoles() {
        return this.prisma.role.findMany();
    }
    async createRole(name, description) {
        const existing = await this.prisma.role.findUnique({ where: { name } });
        if (existing)
            throw new common_1.BadRequestException('Role already exists');
        return this.prisma.role.create({ data: { name, description } });
    }
    async getRolePermissions(roleId) {
        return this.prisma.rolePermission.findMany({
            where: { roleId },
            include: { permission: true },
        });
    }
    async updateRolePermissions(roleId, permissions) {
        await this.prisma.rolePermission.deleteMany({ where: { roleId } });
        for (const perm of permissions) {
            const permission = await this.prisma.permission.findUnique({ where: { key: perm.key } });
            if (permission) {
                await this.prisma.rolePermission.create({ data: { roleId, permissionId: permission.id } });
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