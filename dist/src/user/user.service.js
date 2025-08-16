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
var UserService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const bcrypt = require("bcrypt");
const audit_log_service_1 = require("../audit-log.service");
const common_2 = require("@nestjs/common");
let UserService = UserService_1 = class UserService {
    prisma;
    auditLogService;
    logger = new common_2.Logger(UserService_1.name);
    constructor(prisma, auditLogService) {
        this.prisma = prisma;
        this.auditLogService = auditLogService;
    }
    async getAllUserPermissionsByTenant(tenantId) {
        const users = await this.prisma.user.findMany({
            where: {
                userRoles: {
                    some: { tenantId }
                }
            },
            include: {
                userPermissions: {
                    where: { tenantId },
                    include: { permissionRef: true }
                },
                userRoles: {
                    where: { tenantId },
                    include: { role: true }
                }
            }
        });
        return users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            roles: u.userRoles.map(ur => ur.role.name),
            permissions: u.userPermissions.map(up => up.permissionRef?.name)
        }));
    }
    async createUser(data, actorUserId, ip, prismaClient) {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        const prisma = prismaClient || this.prisma;
        const tenant = await prisma.tenant.findUnique({ where: { id: data.tenantId } });
        if (!tenant) {
            throw new common_1.BadRequestException(`Tenant with id '${data.tenantId}' does not exist. Cannot create user.`);
        }
        const user = await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
            },
        });
        const role = await prisma.role.findUnique({
            where: { name: data.role }
        });
        if (!role) {
            throw new common_1.BadRequestException(`Role '${data.role}' not found`);
        }
        await prisma.userRole.create({
            data: {
                userId: user.id,
                roleId: role.id,
                tenantId: data.tenantId,
            },
        });
        if (this.auditLogService) {
            await this.auditLogService.log(actorUserId || null, 'user_created', { createdUserId: user.id, email: user.email, role: data.role }, ip);
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
            return user;
        }
        catch (error) {
            console.error(`Error in findByEmail for ${email}:`, error);
            throw error;
        }
    }
    async getUserRoles(tenantId) {
        return this.prisma.role.findMany({
            where: { tenantId },
            include: {
                rolePermissions: true,
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
            console.log("role: ", role);
            await this.prisma.userRole.upsert({
                where: {
                    userId_roleId_tenantId: {
                        userId: id,
                        roleId: role.id,
                        tenantId: tenantId
                    }
                },
                update: {},
                create: {
                    userId: id,
                    roleId: role.id,
                    tenantId: tenantId
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
    async updateUserPermissions(userId, tenantId, permissions, grantedBy, ip) {
        console.log("tried updating the perm:  ");
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
                        tenantId,
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
    async getUserPermissions(userId) {
        console.log("userId: ", userId);
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
        console.log("userInTenat: ", userInTenant);
        if (!userInTenant) {
            throw new common_1.NotFoundException('User not found in tenant');
        }
        return this.prisma.userPermission.findMany({
            where: {
                userId,
                OR: [
                    { tenantId },
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
        try {
            return [];
        }
        catch (error) {
            this.logger.error(`Error getting effective permissions for user ${userId}:`, error);
            return [];
        }
    }
    async getUserById(id) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id },
                include: {
                    userRoles: {
                        select: {
                            role: true,
                            tenant: true
                        }
                    }
                }
            });
            if (!user) {
                throw new common_1.NotFoundException('User not found');
            }
            const transformedUser = {
                ...user,
                roles: user.userRoles.map(ur => ({
                    ...ur.role,
                    tenant: ur.tenant
                }))
            };
            return transformedUser;
        }
        catch (error) {
            this.logger.error(`Error getting user by ID ${id}:`, error);
            throw error;
        }
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
    async updateUserPermissionsByTenant(userId, permissions, tenantId, grantedBy, ip) {
        this.logger.log(`Updating permissions for userId=${userId}, tenantId=${tenantId}`);
        this.logger.log(`Requested permissions: ${JSON.stringify(permissions)}`);
        const permissionNames = permissions.map(p => p.name).filter((n) => !!n);
        if (permissionNames.length === 0) {
            this.logger.warn('No valid permission names provided');
            throw new common_1.BadRequestException('No valid permission names provided');
        }
        const allPerms = await this.prisma.permission.findMany({
            where: { name: { in: permissionNames } }
        });
        const foundNames = allPerms.map(p => p.name);
        const missing = permissionNames.filter(n => !foundNames.includes(n));
        if (missing.length > 0) {
            this.logger.warn(`Some permissions do not exist: ${missing.join(', ')}`);
            throw new common_1.BadRequestException(`Permissions not found: ${missing.join(', ')}`);
        }
        await this.prisma.userPermission.deleteMany({
            where: { userId, tenantId }
        });
        for (const p of permissions) {
            const perm = allPerms.find(ap => ap.name === p.name);
            if (!perm) {
                this.logger.error(`Permission ${p.name} not found in DB, skipping.`);
                continue;
            }
            let grantedByUserId = undefined;
            if (grantedBy) {
                const userExists = await this.prisma.user.findUnique({ where: { id: grantedBy } });
                if (userExists) {
                    grantedByUserId = grantedBy;
                }
            }
            const data = {
                userId,
                permission: perm.name,
                grantedAt: new Date(),
                tenantId,
            };
            if (grantedByUserId !== undefined) {
                data.grantedBy = grantedByUserId;
            }
            try {
                await this.prisma.userPermission.create({ data });
                this.logger.log(`Assigned permission ${perm.name} to user ${userId} for tenant ${tenantId}`);
            }
            catch (err) {
                this.logger.error(`Failed to assign permission ${perm.name} to user ${userId}: ${err.message}`);
            }
        }
        if (this.auditLogService) {
            await this.auditLogService.log(grantedBy || null, 'permissions_updated', { userId, newPermissions: permissions, tenantId }, ip);
        }
        const updatedUser = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                userPermissions: {
                    where: { tenantId },
                    include: { permissionRef: true, tenant: true }
                }
            }
        });
        this.logger.log(`Updated permissions for user ${userId}: ${JSON.stringify(updatedUser?.userPermissions)}`);
        return updatedUser;
    }
    async getAllPermissions() {
        return this.prisma.permission.findMany({
            select: { name: true }
        });
    }
};
exports.UserService = UserService;
exports.UserService = UserService = UserService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, audit_log_service_1.AuditLogService])
], UserService);
//# sourceMappingURL=user.service.js.map