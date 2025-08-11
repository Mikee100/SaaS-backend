import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import { AuditLogService } from '../audit-log.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService, private auditLogService: AuditLogService) {}

  async createUser(data: { email: string; password: string; name: string; role: string; tenantId: string }, actorUserId?: string, ip?: string) {
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

    // Assign role
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

      // Ensure userRoles exists and is an array
      if (user.userRoles && !Array.isArray(user.userRoles)) {
        user.userRoles = [];
      } else if (!user.userRoles) {
        user.userRoles = [];
      }

      // Filter out any invalid user roles
      user.userRoles = user.userRoles.filter(ur => ur && ur.role);

      return user;
    } catch (error) {
      console.error(`Error in findByEmail for ${email}:`, error);
      throw error;
    }
  }

  async getUserRoles(userId: string) {
    return this.prisma.userRole.findMany({
      where: { userId },
      include: { 
        role: true,
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
        userPermissions: {
          include: { 
            permissionRef: true 
          }
        }
      }
    });
  }

  async updateUser(id: string, data: { name?: string; role?: string }, tenantId: string, actorUserId?: string, ip?: string) {
    // If role is being updated, handle role assignment
    if (data.role) {
      const role = await this.prisma.role.findUnique({ where: { name: data.role } });
      if (!role) {
        throw new NotFoundException(`Role '${data.role}' not found`);
      }

      // Update or create user role
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

  async updateUserPermissions(userId: string, permissions: Array<{ name: string; note?: string }>, grantedBy?: string, ip?: string) {
    // Get all permissions from the Permission table
    const permissionNames = permissions.map(p => p.name);
    const allPerms = await this.prisma.permission.findMany({ 
      where: { name: { in: permissionNames } } 
    });
    
    // Remove all current permissions for the user
    await this.prisma.userPermission.deleteMany({ 
      where: { userId } 
    });
    
    // Add new permissions with notes, grantedBy, grantedAt
    await Promise.all(
      permissions.map(async (p) => {
        const perm = allPerms.find(ap => ap.name === p.name);
        if (perm) {
          await this.prisma.userPermission.create({
            data: {
              userId,
              permission: perm.name,
              grantedBy: grantedBy || 'system',
              grantedAt: new Date(),
              note: p.note || null,
              tenantId: null, // Global permissions have null tenantId
              createdAt: new Date(),
              updatedAt: new Date()
            },
          });
        }
      })
    );
    
    if (this.auditLogService) {
      await this.auditLogService.log(grantedBy || null, 'permissions_updated', { userId, newPermissions: permissions }, ip);
    }
    
    // Return updated user with permissions
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

  async updateUserPermissionsByTenant(userId: string, permissions: Array<{ name: string; note?: string }>, tenantId: string, grantedBy?: string, ip?: string) {
    // First verify the user belongs to the tenant
    const userInTenant = await this.prisma.userRole.findFirst({
      where: { userId, tenantId }
    });
    
    if (!userInTenant) {
      throw new NotFoundException('User not found in tenant');
    }
    
    // Get all permissions from the Permission table
    const permissionNames = permissions.map(p => p.name);
    const allPerms = await this.prisma.permission.findMany({ 
      where: { name: { in: permissionNames } } 
    });
    
    // Remove all current permissions for the user in this tenant
    await this.prisma.userPermission.deleteMany({ 
      where: { 
        userId,
        tenantId
      } 
    });
    
    // Add new permissions with notes, grantedBy, grantedAt
    await Promise.all(
      permissions.map(async (p) => {
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
      })
    );
    
    if (this.auditLogService) {
      await this.auditLogService.log(grantedBy || null, 'permissions_updated', { userId, newPermissions: permissions, tenantId }, ip);
    }
    
    // Return updated user with permissions
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

  async getUserPermissions(userId: string) {
    return this.prisma.userPermission.findMany({
      where: { userId },
      include: { 
        permissionRef: true,
        tenant: true
      },
    });
  }

  async getUserPermissionsByTenant(userId: string, tenantId: string) {
    // First verify the user belongs to the tenant
    const userInTenant = await this.prisma.userRole.findFirst({
      where: { userId, tenantId }
    });
    
    if (!userInTenant) {
      throw new NotFoundException('User not found in tenant');
    }
    
    return this.prisma.userPermission.findMany({
      where: { 
        userId,
        OR: [
          { tenantId },
          { tenantId: null } // Include global permissions
        ]
      },
      include: { 
        permissionRef: true,
        tenant: true
      },
    });
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

  async updateUserPreferences(userId: string, data: { notificationPreferences?: any, language?: string, region?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
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

  async getEffectivePermissions(userId: string, tenantId: string): Promise<string[]> {
    // 1. Get user's direct permissions (both global and tenant-specific)
    const directPermissions = await this.prisma.userPermission.findMany({
      where: {
        userId,
        OR: [
          { tenantId: null }, // Global permissions
          { tenantId } // Tenant-specific permissions
        ]
      },
      include: { 
        permissionRef: true 
      }
    });

    // 2. Get permissions from user's roles in this tenant
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

    // Extract permission names from direct permissions
    const directPerms = directPermissions
      .filter(p => p.permissionRef)
      .map(p => p.permissionRef.name);

    // Extract permission names from role permissions
    const rolePerms = userRoles.flatMap(ur => 
      ur.role.rolePermissions
        .filter(rp => rp.permission)
        .map(rp => rp.permission.name)
    );

    // Combine, dedupe, and return
    return Array.from(new Set([...directPerms, ...rolePerms]));
  }
}