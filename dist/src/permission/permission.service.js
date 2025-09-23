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
                description,
            }
        });
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
        const existing = await this.prisma.role.findFirst({
            where: {
                name: name,
                tenantId: null
            }
        });
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
        return this.prisma.$transaction(async (prisma) => {
            await prisma.rolePermission.deleteMany({
                where: { roleId },
            });
            const permissions = await prisma.permission.findMany({
                where: {
                    name: { in: permissionNames },
                },
            });
            const rolePermissions = await Promise.all(permissions.map((permission) => prisma.rolePermission.create({
                data: {
                    roleId,
                    permissionId: permission.id,
                },
            })));
            return rolePermissions;
        });
    }
};
exports.PermissionService = PermissionService;
exports.PermissionService = PermissionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PermissionService);
//# sourceMappingURL=permission.service.js.map