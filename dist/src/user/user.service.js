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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const bcrypt = require("bcrypt");
const audit_log_service_1 = require("../audit-log.service");
let UserService = class UserService {
    prisma;
    auditLogService;
    constructor(prisma, auditLogService) {
        this.prisma = prisma;
        this.auditLogService = auditLogService;
    }
    async createUser(data, actorUserId, ip) {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        const user = await this.prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
            },
        });
        if (this.auditLogService) {
            await this.auditLogService.log(actorUserId || null, 'user_created', { createdUserId: user.id, email: user.email, role: data.role }, ip);
        }
        const role = await this.prisma.role.findUnique({ where: { name: data.role } });
        if (role) {
            await this.prisma.userRole.create({
                data: {
                    userId: user.id,
                    roleId: role.id,
                    tenantId: data.tenantId,
                },
            });
        }
        return user;
    }
    async findByEmail(email) {
        return this.prisma.user.findUnique({ where: { email } });
    }
    async getUserRoles(userId) {
        return this.prisma.userRole.findMany({
            where: { userId },
            include: { role: true },
        });
    }
    async findAllByTenant(tenantId) {
        return this.prisma.user.findMany({
            where: {
                userRoles: {
                    some: { tenantId }
                }
            },
            include: {
                userRoles: {
                    include: { role: true }
                },
                permissions: {
                    include: { permission: true }
                }
            }
        });
    }
    async updateUser(id, data, tenantId, actorUserId, ip) {
        const result = await this.prisma.user.updateMany({
            where: {
                id,
                userRoles: {
                    some: { tenantId }
                }
            },
            data,
        });
        if (this.auditLogService) {
            await this.auditLogService.log(actorUserId || null, 'user_updated', { userId: id, updatedFields: data }, ip);
        }
        return result;
    }
    async updateUserPermissions(userId, permissions, grantedBy, ip) {
        const keys = permissions.map(p => p.key);
        const allPerms = await this.prisma.permission.findMany({ where: { key: { in: keys } } });
        await this.prisma.userPermission.deleteMany({ where: { userId } });
        await Promise.all(permissions.map(async (p) => {
            const perm = allPerms.find(ap => ap.key === p.key);
            if (perm) {
                await this.prisma.userPermission.create({
                    data: {
                        userId,
                        permissionId: perm.id,
                        grantedBy,
                        grantedAt: new Date(),
                        note: p.note || null,
                    },
                });
            }
        }));
        if (this.auditLogService) {
            await this.auditLogService.log(grantedBy || null, 'permissions_updated', { userId, newPermissions: permissions }, ip);
        }
        return this.prisma.user.findUnique({
            where: { id: userId },
            include: { permissions: { include: { permission: true } } },
        });
    }
    async updateUserPermissionsByTenant(userId, permissions, tenantId, grantedBy, ip) {
        const userInTenant = await this.prisma.userRole.findFirst({
            where: { userId, tenantId }
        });
        if (!userInTenant) {
            throw new Error('User not found in tenant');
        }
        const keys = permissions.map(p => p.key);
        const allPerms = await this.prisma.permission.findMany({ where: { key: { in: keys } } });
        await this.prisma.userPermission.deleteMany({ where: { userId } });
        await Promise.all(permissions.map(async (p) => {
            const perm = allPerms.find(ap => ap.key === p.key);
            if (perm) {
                await this.prisma.userPermission.create({
                    data: {
                        userId,
                        permissionId: perm.id,
                        grantedBy,
                        grantedAt: new Date(),
                        note: p.note || null,
                    },
                });
            }
        }));
        if (this.auditLogService) {
            await this.auditLogService.log(grantedBy || null, 'permissions_updated', { userId, newPermissions: permissions, tenantId }, ip);
        }
        return this.prisma.user.findUnique({
            where: { id: userId },
            include: { permissions: { include: { permission: true } } },
        });
    }
    async deleteUser(id, tenantId, actorUserId, ip) {
        const result = await this.prisma.user.deleteMany({
            where: {
                id,
                userRoles: {
                    some: { tenantId }
                }
            },
        });
        if (this.auditLogService) {
            await this.auditLogService.log(actorUserId || null, 'user_deleted', { userId: id }, ip);
        }
        return result;
    }
    async getUserPermissions(userId) {
        return this.prisma.userPermission.findMany({
            where: { userId },
            include: { permission: true },
        });
    }
    async getUserPermissionsByTenant(userId, tenantId) {
        const userInTenant = await this.prisma.userRole.findFirst({
            where: { userId, tenantId }
        });
        if (!userInTenant) {
            throw new Error('User not found in tenant');
        }
        return this.prisma.userPermission.findMany({
            where: { userId },
            include: { permission: true },
        });
    }
    async updateUserByEmail(email, data) {
        return this.prisma.user.update({
            where: { email },
            data,
        });
    }
    async updateUserPreferences(userId, data) {
        return this.prisma.user.update({
            where: { id: userId },
            data,
        });
    }
    async resetPassword(token, newPassword) {
        const user = await this.prisma.user.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: {
                    gt: new Date(),
                },
            },
        });
        if (!user) {
            throw new Error('Invalid or expired reset token');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null,
            },
        });
        return user;
    }
    async getEffectivePermissions(userId, tenantId) {
        const direct = await this.prisma.userPermission.findMany({
            where: { userId },
            include: { permission: true }
        });
        const directPerms = direct.map((p) => p.permission.key);
        const roles = await this.prisma.userRole.findMany({
            where: { userId, tenantId },
            include: {
                role: {
                    include: {
                        rolePermissions: { include: { permission: true } }
                    }
                }
            }
        });
        const rolePerms = roles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.key));
        return Array.from(new Set([...directPerms, ...rolePerms]));
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, audit_log_service_1.AuditLogService])
], UserService);
//# sourceMappingURL=user.service.js.map