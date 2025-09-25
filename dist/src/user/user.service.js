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
    async updateUserPermissions(userId, permissions, tenantId, actorUserId, ip) {
        await this.prisma.userPermission.deleteMany({
            where: { userId, tenantId }
        });
        for (const permKey of permissions) {
            if (!permKey) {
                this.logger.warn(`Skipped empty permission key for user ${userId}`);
                continue;
            }
            const perm = await this.prisma.permission.findFirst({ where: { name: permKey } });
            if (perm) {
                this.logger.log(`Assigning permission '${permKey}' (id: ${perm.id}) to user ${userId} for tenant ${tenantId}`);
                await this.prisma.userPermission.create({
                    data: { userId, tenantId, permission: perm.id }
                });
            }
            else {
                this.logger.warn(`Permission '${permKey}' not found in Permission table for user ${userId}`);
            }
        }
        if (this.auditLogService) {
            await this.auditLogService.log(actorUserId || null, 'user_permissions_updated', { userId, permissions }, ip);
        }
        return { success: true };
    }
    async findById(id, options = {}) {
        const defaultInclude = {
            userRoles: {
                include: {
                    Role: true
                }
            }
        };
        return this.prisma.user.findUnique({
            where: { id },
            include: options.include || defaultInclude
        });
    }
    logger = new common_2.Logger(UserService_1.name);
    constructor(prisma, auditLogService) {
        this.prisma = prisma;
        this.auditLogService = auditLogService;
    }
    async createUser(data, actorUserId, ip, prismaClient) {
        const prisma = prismaClient || this.prisma;
        const tenant = await prisma.tenant.findUnique({ where: { id: data.tenantId } });
        if (!tenant) {
            throw new common_1.BadRequestException(`Tenant with id '${data.tenantId}' does not exist. Cannot create user.`);
        }
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email },
            select: { id: true, tenantId: true }
        });
        if (existingUser) {
            throw new common_1.BadRequestException(`A user with email '${data.email}' already exists. ` +
                `Please use a different email address or contact support if you need assistance.`);
        }
        const hashedPassword = await bcrypt.hash(data.password, 10);
        const user = await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                tenantId: data.tenantId,
                branchId: data.branchId,
            },
        });
        this.logger.log(`Created user: ${user.id}, tenant: ${data.tenantId}`);
        let role = await prisma.role.findUnique({ where: { name_tenantId: { name: data.role, tenantId: data.tenantId } } });
        if (!role) {
            role = await prisma.role.create({
                data: {
                    name: data.role,
                    description: `${data.role.charAt(0).toUpperCase() + data.role.slice(1)} role`,
                    tenantId: data.tenantId,
                }
            });
            this.logger.log(`Created role: ${role.id}, name: ${role.name}, tenant: ${data.tenantId}`);
        }
        const userRole = await prisma.userRole.create({
            data: {
                userId: user.id,
                roleId: role.id,
                tenantId: data.tenantId,
            },
        });
        this.logger.log(`Assigned role to user: userRoleId=${userRole.id}, userId=${user.id}, roleId=${role.id}, tenantId=${data.tenantId}`);
        if (role.name === 'owner') {
            const permissions = await prisma.permission.findMany();
            for (const perm of permissions) {
                const exists = await prisma.rolePermission.findFirst({ where: { roleId: role.id, permissionId: perm.id } });
                if (!exists) {
                    await prisma.rolePermission.create({
                        data: {
                            roleId: role.id,
                            permissionId: perm.id,
                        }
                    });
                }
            }
        }
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
                                permissions: {
                                    include: {
                                        Permission: true
                                    }
                                }
                            }
                        },
                        Tenant: true
                    }
                },
            };
            const queryInclude = include || defaultInclude;
            this.logger.log(`Querying database for user with email: ${email}`);
            try {
                const user = await this.prisma.user.findUnique({
                    where: { email },
                    include: queryInclude
                });
                if (user) {
                    this.logger.log(`Found user: ${user.id} with email: ${email}`);
                    return user;
                }
                else {
                    this.logger.warn(`No user found with email: ${email}`);
                    return null;
                }
            }
            catch (error) {
                if (error.code === 'P2022' && error.meta?.column === 'User.isActive') {
                    this.logger.warn('isActive column not found, falling back to basic user query');
                    const basicUser = await this.prisma.user.findUnique({
                        where: { email },
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            password: true,
                            tenantId: true,
                            branchId: true,
                        }
                    });
                    if (basicUser) {
                        return { ...basicUser, isActive: true };
                    }
                    return null;
                }
                throw error;
            }
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
                permissions: true,
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
            }
        });
    }
    async findByTenantAndBranch(tenantId, branchId) {
        const where = { tenantId };
        if (branchId === "unassigned" || branchId === null) {
            where.branchId = null;
        }
        else {
            where.branchId = branchId;
        }
        return this.prisma.user.findMany({
            where,
            include: {
                userRoles: {
                    include: {
                        role: true
                    }
                }
            }
        });
    }
    async updateUser(id, data, tenantId, actorUserId, ip) {
        if (data.role) {
            const role = await this.prisma.role.findUnique({ where: { name_tenantId: { name: data.role, tenantId } } });
            if (!role) {
                throw new common_1.NotFoundException(`Role '${data.role}' not found for tenant ${tenantId}`);
            }
            await this.prisma.userRole.upsert({
                where: {
                    userId_roleId_tenantId: {
                        userId: id,
                        roleId: role.id,
                        tenantId: tenantId
                    }
                },
                update: {
                    roleId: role.id
                },
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
                ...(data.branchId ? { branchId: data.branchId } : {}),
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
            this.logger.log(`getEffectivePermissions called for userId=${userId}, tenantId=${tenantId}`);
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                include: {
                    userRoles: {
                        include: { role: true }
                    }
                }
            });
            this.logger.log(`User loaded: ${user ? user.id : 'not found'}`);
            if (!user)
                return [];
            const isOwner = user.userRoles.some(ur => ur.role?.name?.toLowerCase() === 'owner' ||
                ur.role?.name?.toLowerCase() === 'admin');
            this.logger.log(`User isOwner/admin: ${isOwner}`);
            if (isOwner) {
                const allPerms = await this.prisma.permission.findMany();
                this.logger.log(`Returning all permissions for owner/admin: count=${allPerms.length}`);
                return allPerms.map(p => ({ name: p.name }));
            }
            const permissionWhere = { userId };
            if (tenantId) {
                permissionWhere.tenantId = tenantId;
            }
            this.logger.log(`Direct userPermission where clause: ${JSON.stringify(permissionWhere)}`);
            const directUserPermissions = await this.prisma.userPermission.findMany({
                where: permissionWhere,
                include: { permissionRef: true }
            });
            this.logger.log(`Direct user permissions found: ${directUserPermissions.length}`);
            const roleIds = user.userRoles.map(ur => ur.role?.id).filter(Boolean);
            this.logger.log(`User roleIds: ${JSON.stringify(roleIds)}`);
            let rolePermissions = [];
            if (roleIds.length > 0) {
                const roleWhere = {
                    roleId: { in: roleIds }
                };
                if (tenantId) {
                    roleWhere.AND = [
                        { role: { tenantId } },
                        { roleId: { in: roleIds } }
                    ];
                }
                this.logger.log(`RolePermission where clause: ${JSON.stringify(roleWhere)}`);
                rolePermissions = await this.prisma.rolePermission.findMany({
                    where: roleWhere,
                    include: { permission: true }
                });
                this.logger.log(`Role permissions found: ${rolePermissions.length}`);
            }
            const allPermissions = [
                ...directUserPermissions
                    .filter(up => up.permissionRef?.name)
                    .map(up => up.permissionRef.name),
                ...rolePermissions
                    .filter(rp => rp.permission?.name)
                    .map(rp => rp.permission.name)
            ];
            const uniquePermissions = Array.from(new Set(allPermissions));
            this.logger.log(`Unique permissions for user: ${JSON.stringify(uniquePermissions)}`);
            return uniquePermissions.map(name => ({ name }));
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