import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import { AuditLogService } from '../audit-log.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class UserService {
  async updateUserPermissions(userId: string, permissions: string[], tenantId: string, actorUserId?: string, ip?: string) {
  // ...existing code...
    // Remove all direct user permissions for this user in this tenant
    await this.prisma.userPermission.deleteMany({
      where: { userId, tenantId }
    });
    // Add new permissions
    for (const permKey of permissions) {
      if (!permKey) {
        this.logger.warn(`Skipped empty permission key for user ${userId}`);
        continue;
      }
      const perm = await this.prisma.permission.findFirst({ where: { name: permKey } });
      if (perm) {
        this.logger.log(`Assigning permission '${permKey}' (id: ${perm.id}) to user ${userId} for tenant ${tenantId}`);
        await this.prisma.userPermission.create({
          data: { userId, permissionId: perm.id, tenantId }
        });
      } else {
        this.logger.warn(`Permission '${permKey}' not found in Permission table for user ${userId}`);
      }
    }
    // Log the action
    if (this.auditLogService) {
      await this.auditLogService.log(actorUserId || null, 'user_permissions_updated', { userId, permissions }, ip);
    }
    return { success: true };
  }
  async findById(id: string, options: { include?: any } = {}) {
    const defaultInclude = {
      userRoles: {
        include: {
          role: true
        }
      }
    };
    
    return this.prisma.user.findUnique({
      where: { id },
      include: options.include || defaultInclude
    });
  }
  private readonly logger = new Logger(UserService.name);

  constructor(private prisma: PrismaService, private auditLogService: AuditLogService) {}


   

  // ...existing code...

  async createUser(
    data: { email: string; password: string; name: string; role: string; tenantId: string; branchId?: string },
    actorUserId?: string,
    ip?: string,
    prismaClient?: any
  ) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const prisma = prismaClient || this.prisma;
    // Check if tenant exists
    const tenant = await prisma.tenant.findUnique({ where: { id: data.tenantId } });
    if (!tenant) {
      throw new BadRequestException(`Tenant with id '${data.tenantId}' does not exist. Cannot create user.`);
    }

    // Create the user
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

    // Find the role for this tenant using composite unique constraint
    let role = await prisma.role.findUnique({ where: { name_tenantId: { name: data.role, tenantId: data.tenantId } } });
    if (!role) {
      // Create the role if it doesn't exist
      role = await prisma.role.create({
        data: {
          name: data.role,
          description: `${data.role.charAt(0).toUpperCase() + data.role.slice(1)} role`,
          tenantId: data.tenantId,
        }
      });
      this.logger.log(`Created role: ${role.id}, name: ${role.name}, tenant: ${data.tenantId}`);
    }
    // Assign role to user
    const userRole = await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
        tenantId: data.tenantId,
      },
    });
    this.logger.log(`Assigned role to user: userRoleId=${userRole.id}, userId=${user.id}, roleId=${role.id}, tenantId=${data.tenantId}`);

    // Automatically assign all permissions to owner role
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

    // Log the action
    if (this.auditLogService) {
      await this.auditLogService.log(
        actorUserId || null, 
        'user_created', 
        { createdUserId: user.id, email: user.email, role: data.role }, 
        ip
      );
    }

    return user;
  }

  async findByEmail(email: string, include?: any) {
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
      };

      // If no custom include is provided, use the default one
      const queryInclude = include || defaultInclude;

      this.logger.log(`Querying database for user with email: ${email}`);
      const user = await this.prisma.user.findUnique({
        where: { email },
        include: queryInclude
      });
      
      if (user) {
        this.logger.log(`Found user: ${user.id} with email: ${email}`);
      } else {
        this.logger.warn(`No user found with email: ${email}`);
      }

      if (!user) {
        return null;
      }
      return user;
    } catch (error) {
      console.error(`Error in findByEmail for ${email}:`, error);
      throw error;
    }
  }

  async getUserRoles(tenantId: string) {
    return this.prisma.role.findMany({
      where: { tenantId },
      include: { 
        rolePermissions: true,
        tenant: true
      },
    });
  }

  async findAllByTenant(tenantId: string) {
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
  // ...existing code...
      }
    });
  }

  async findByTenantAndBranch(tenantId: string, branchId: string) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        branchId
      },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });
  }

  async updateUser(id: string, data: { name?: string; role?: string }, tenantId: string, actorUserId?: string, ip?: string) {
    // If role is being updated, handle role assignment
    if (data.role) {
      const role = await this.prisma.role.findUnique({ where: { name_tenantId: { name: data.role, tenantId } } });
      if (!role) {
        throw new NotFoundException(`Role '${data.role}' not found for tenant ${tenantId}`);
      }
      // Update or create user role
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
      // Remove role from data to prevent updating it directly
      delete data.role;
    }

    // Update user data if there's anything left to update
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
    
    return result || { count: 1 }; // Return a result object similar to updateMany
  }

  async updateUserByEmail(email: string, data: any) {
    return this.prisma.user.update({
      where: { email },
      data: {
        ...data,
        updatedAt: new Date()
      },
    });
  }

  async updateUserPreferences(userId: string, data: { notificationPreferences?: any, language?: string, region?: string, branchId?: string }) {
    // Accept branchId in preferences update
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        ...(data.branchId ? { branchId: data.branchId } : {}),
        updatedAt: new Date()
      },
    });
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Invalid or expired reset token');
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

async getEffectivePermissions(userId: string, tenantId?: string): Promise<Array<{ name: string }>> {
  try {
    // Get user with roles
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: { role: true }
        }
      }
    });
    if (!user) return [];
    
    // Check if user has owner role
    const isOwner = user.userRoles.some(ur => 
      ur.role?.name?.toLowerCase() === 'owner' || 
      ur.role?.name?.toLowerCase() === 'admin'
    );
    
    if (isOwner) {
      // Return all permissions in the system
      const allPerms = await this.prisma.permission.findMany();
      return allPerms.map(p => ({ name: p.name }));
    }
    
    // Prepare where clause for permissions query
    const permissionWhere: any = { userId };
    if (tenantId) {
      permissionWhere.tenantId = tenantId;
    }
    
    // Get direct user permissions
    const directUserPermissions = await this.prisma.userPermission.findMany({
      where: permissionWhere,
      include: { permission: true }
    });
    
    // Get permissions from user's roles
    const roleIds = user.userRoles.map(ur => ur.role?.id).filter(Boolean);
    let rolePermissions: any[] = [];
    
    if (roleIds.length > 0) {
      rolePermissions = await this.prisma.rolePermission.findMany({
        where: { 
          roleId: { in: roleIds },
          ...(tenantId && { tenantId }) // Only filter by tenantId if provided
        },
        include: { permission: true }
      });
    }
    
    // Combine and deduplicate permissions
    const allPermissions = [
      ...directUserPermissions
        .filter(up => up.permission?.name)
        .map(up => up.permission.name),
      ...rolePermissions
        .filter(rp => rp.permission?.name)
        .map(rp => rp.permission.name)
    ];
    
    const uniquePermissions = Array.from(new Set(allPermissions));
    return uniquePermissions.map(name => ({ name }));
  } catch (error) {
    this.logger.error(`Error getting effective permissions for user ${userId}:`, error);
    return [];
  }
}

  async getUserById(id: string) {
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
        throw new NotFoundException('User not found');
      }

      // Transform userRoles to match expected format
      const transformedUser = {
        ...user,
        roles: user.userRoles.map(ur => ({
          ...ur.role,
          tenant: ur.tenant
        }))
      };

      // Remove sensitive data
  // delete transformedUser.password;
  // delete transformedUser.userRoles;

      return transformedUser;
    } catch (error) {
      this.logger.error(`Error getting user by ID ${id}:`, error);
      throw error;
    }
  }

  async deleteUser(id: string, tenantId: string, actorUserId?: string, ip?: string) {
    // First remove user roles for this tenant
    await this.prisma.userRole.deleteMany({
      where: {
        userId: id,
        tenantId
      }
    });

    // Check if user has any remaining roles
    const remainingRoles = await this.prisma.userRole.count({
      where: { userId: id }
    });

    // If no remaining roles, delete the user
    let result;
    if (remainingRoles === 0) {
      result = await this.prisma.user.delete({
        where: { id },
      });
    } else {
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
}