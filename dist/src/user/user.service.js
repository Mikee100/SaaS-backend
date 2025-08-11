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
                createdAt: new Date(),
                updatedAt: new Date(),
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
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });
        }
        return user;
    }
    async findByEmail(email, include) {
        try {
            const defaultInclude = {
                userRoles: {
                    include: {
                        role: {
                            include: {
                                rolePermissions: {
                                    include: {
                                        permission: true
                                    }
                                }
                            }
                        },
                        tenant: true
                    }
                },
                userPermissions: {
                    include: {
                        permissionRef: true
                    }
                }
            };
            const finalInclude = include || defaultInclude;
            const user = await this.prisma.user.findUnique({
                where: { email },
                include: finalInclude
            });
            if (!user) {
                return null;
            }
            if (user.userRoles && !Array.isArray(user.userRoles)) {
                user.userRoles = [];
            }
            else if (!user.userRoles) {
                user.userRoles = [];
            }
            user.userRoles = user.userRoles.filter(ur => ur && ur.role);
            return user;
        }
        catch (error) {
            console.error(`Error in findByEmail for ${email}:`, error);
            throw error;
        }
    }
    async getUserRoles(userId) {
        return this.prisma.userRole.findMany({
            where: { userId },
            include: {
                role: true,
                tenant: true
            },
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
                    include: {
                        role: true,
                        tenant: true
                    }
                },
                userPermissions: {
                    include: {
                        permissionRef: true
                    }
                }
            }
        });
    }
    async updateUser(id, data, tenantId, actorUserId, ip) {
        if (data.role) {
            const role = await this.prisma.role.findUnique({ where: { name: data.role } });
            if (!role) {
                throw new common_1.NotFoundException(`Role '${data.role}' not found`);
            }
            await this.prisma.userRole.upsert({
                where: {
                    userId_tenantId: {
                        userId: id,
                        tenantId: tenantId
                    }
                },
                update: {
                    roleId: role.id,
                    updatedAt: new Date()
                },
                create: {
                    userId: id,
                    roleId: role.id,
                    tenantId: tenantId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
            delete data.role;
        }
        let result;
        if (Object.keys(data).length > 0) {
            result = await this.prisma.user.updateMany({
                where: {
                    id,
                    userRoles: {
                        some: { tenantId }
                    }
                },
                data: {
                    ...data,
                    updatedAt: new Date()
                },
            });
        }
        if (this.auditLogService) {
            await this.auditLogService.log(actorUserId || null, 'user_updated', { userId: id, updatedFields: data }, ip);
        }
        return result || { count: 1 };
    }
    async updateUserPermissions(userId, permissions, grantedBy, ip) {
        const permissionNames = permissions.map(p => p.name);
        const allPerms = await this.prisma.permission.findMany({
            where: { name: { in: permissionNames } }
        });
        await this.prisma.userPermission.deleteMany({
            where: { userId }
        });
        await Promise.all(permissions.map(async (p) => {
            const perm = allPerms.find(ap => ap.name === p.name);
            if (perm) {
                await this.prisma.userPermission.create({
                    data: {
                        userId,
                        permission: perm.name,
                        grantedBy: grantedBy || 'system',
                        grantedAt: new Date(),
                        note: p.note || null,
                        tenantId: null,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    },
                });
            }
        }));
        if (this.auditLogService) {
            await this.auditLogService.log(grantedBy || null, 'permissions_updated', { userId, newPermissions: permissions }, ip);
        }
        return this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                userPermissions: {
                    include: {
                        permissionRef: true
                    }
                }
            },
        });
    }
    async updateUserPermissionsByTenant(userId, permissions, tenantId, grantedBy, ip) {
        const userInTenant = await this.prisma.userRole.findFirst({
            where: { userId, tenantId }
        });
        if (!userInTenant) {
            throw new common_1.NotFoundException('User not found in tenant');
        }
        const permissionNames = permissions.map(p => p.name);
        const allPerms = await this.prisma.permission.findMany({
            where: { name: { in: permissionNames } }
        });
        await this.prisma.userPermission.deleteMany({
            where: {
                userId,
                tenantId
            }
        });
        await Promise.all(permissions.map(async (p) => {
            const perm = allPerms.find(ap => ap.name === p.name);
            if (perm) {
                await this.prisma.userPermission.create({
                    data: {
                        userId,
                        permission: perm.name,
                        grantedBy: grantedBy || 'system',
                        grantedAt: new Date(),
                        note: p.note || null,
                        tenantId,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    },
                });
            }
        }));
        if (this.auditLogService) {
            await this.auditLogService.log(grantedBy || null, 'permissions_updated', { userId, newPermissions: permissions, tenantId }, ip);
        }
        return this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                userPermissions: {
                    where: { tenantId },
                    include: {
                        permissionRef: true
                    }
                }
            },
        });
    }
    async deleteUser(id, tenantId, actorUserId, ip) {
        await this.prisma.userRole.deleteMany({
            where: {
                userId: id,
                tenantId
            }
        });
        const remainingRoles = await this.prisma.userRole.count({
            where: { userId: id }
        });
        let result;
        if (remainingRoles === 0) {
            result = await this.prisma.user.delete({
                where: { id },
            });
        }
        else {
            result = { id };
        }
        if (this.auditLogService) {
            await this.auditLogService.log(actorUserId || null, 'user_deleted', { userId: id, tenantId }, ip);
        }
        return result;
    }
    async getUserPermissions(userId) {
        return this.prisma.userPermission.findMany({
            where: { userId },
            include: {
                permissionRef: true,
                tenant: true
            },
        });
    }
    async getUserPermissionsByTenant(userId, tenantId) {
        const userInTenant = await this.prisma.userRole.findFirst({
            where: { userId, tenantId }
        });
        if (!userInTenant) {
            throw new common_1.NotFoundException('User not found in tenant');
        }
        return this.prisma.userPermission.findMany({
            where: {
                userId,
                OR: [
                    { tenantId },
                    { tenantId: null }
                ]
            },
            include: {
                permissionRef: true,
                tenant: true
            },
        });
    }
    async updateUserByEmail(email, data) {
        return this.prisma.user.update({
            where: { email },
            data: {
                ...data,
                updatedAt: new Date()
            },
        });
    }
    async updateUserPreferences(userId, data) {
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                ...data,
                updatedAt: new Date()
            },
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
            throw new common_1.NotFoundException('Invalid or expired reset token');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        return this.prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null,
                updatedAt: new Date()
            },
        });
    }
    async getEffectivePermissions(userId, tenantId) {
        const directPermissions = await this.prisma.userPermission.findMany({
            where: {
                userId,
                OR: [
                    { tenantId: null },
                    { tenantId }
                ]
            },
            include: {
                permissionRef: true
            }
        });
        const userRoles = await this.prisma.userRole.findMany({
            where: {
                userId,
                tenantId
            },
            include: {
                role: {
                    include: {
                        rolePermissions: {
                            include: {
                                permission: true
                            }
                        }
                    }
                }
            }
        });
        const directPerms = directPermissions
            .filter(p => p.permissionRef)
            .map(p => p.permissionRef.name);
        const rolePerms = userRoles.flatMap(ur => ur.role.rolePermissions
            .filter(rp => rp.permission)
            .map(rp => rp.permission.name));
        return Array.from(new Set([...directPerms, ...rolePerms]));
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, audit_log_service_1.AuditLogService])
], UserService);
//# sourceMappingURL=user.service.js.map