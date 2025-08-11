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
    async createPermission(name, description) {
        const existing = await this.prisma.permission.findUnique({
            where: { name }
        });
        if (existing)
            return existing;
        return this.prisma.permission.create({
            data: {
                name,
                description
            }
        });
    }
    async seedPermissions(permissions) {
        const results = [];
        for (const perm of permissions) {
            const existingPermission = await this.prisma.permission.findUnique({
                where: { name: perm.name }
            });
            if (!existingPermission) {
                results.push(await this.createPermission(perm.name, perm.description));
            }
            else {
                results.push(existingPermission);
            }
        }
        return results;
    }
    async getAllRoles() {
        return this.prisma.role.findMany({
            include: {
                rolePermissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });
    }
    async createRole(name, description) {
        const existing = await this.prisma.role.findUnique({ where: { name } });
        if (existing)
            throw new common_1.BadRequestException('Role already exists');
        return this.prisma.role.create({
            data: {
                name,
                description,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
    }
    async getRolePermissions(roleId) {
        return this.prisma.rolePermission.findMany({
            where: { roleId },
            include: {
                permission: true,
                role: true
            },
        });
    }
    async updateRolePermissions(roleId, permissionNames) {
        const role = await this.prisma.role.findUnique({
            where: { id: roleId },
            include: { rolePermissions: true }
        });
        if (!role) {
            throw new common_1.BadRequestException('Role not found');
        }
        const permissions = await this.prisma.permission.findMany({
            where: {
                name: { in: permissionNames }
            }
        });
        const currentPermissionIds = role.rolePermissions.map(rp => rp.permissionId);
        const newPermissionIds = permissions.map(p => p.id);
        const permissionsToAdd = newPermissionIds.filter(id => !currentPermissionIds.includes(id));
        const permissionsToRemove = currentPermissionIds.filter(id => !newPermissionIds.includes(id));
        return this.prisma.$transaction(async (prisma) => {
            if (permissionsToRemove.length > 0) {
                await prisma.rolePermission.deleteMany({
                    where: {
                        roleId,
                        permissionId: { in: permissionsToRemove }
                    }
                });
            }
            if (permissionsToAdd.length > 0) {
                await prisma.rolePermission.createMany({
                    data: permissionsToAdd.map(permissionId => ({
                        roleId,
                        permissionId,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    })),
                    skipDuplicates: true
                });
            }
            return this.getRolePermissions(roleId);
        });
    }
};
exports.PermissionService = PermissionService;
exports.PermissionService = PermissionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PermissionService);
//# sourceMappingURL=permission.service.js.map