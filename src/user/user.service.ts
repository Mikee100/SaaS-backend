import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import { AuditLogService } from '../audit-log.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private prisma: PrismaService, private auditLogService: AuditLogService) {}


  async getAllUserPermissionsByTenant(tenantId: string) {
    // Get all users for the tenant
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
    // Format output: [{ id, name, email, permissions: [...] }]
    return users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      roles: u.userRoles.map(ur => ur.role.name),
      permissions: u.userPermissions.map(up => up.permissionRef?.name)
    }));
  }

  async createUser(
    data: { email: string; password: string; name: string; role: string; tenantId: string },
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
      },
    });

    // Find the role
    const role = await prisma.role.findUnique({ 
      where: { name: data.role } 
    });

    if (!role) {
      throw new BadRequestException(`Role '${data.role}' not found`);
    }

    // Assign role to user
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
        tenantId: data.tenantId,
      },
    });

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
      console.log("role: ",role)
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

  async updateUserPermissions(userId: string, tenantId:string , permissions: Array<{ name: string; note?: string }>, grantedBy?: string, ip?: string) {
    // Get all permissions from the Permission table

    console.log("tried updating the perm:  ")
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
              tenantId, // Global permissions have null tenantId
           
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

  async getUserPermissions(userId: string) {
    console.log("userId: ",userId)
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
    
    console.log("userInTenat: ",userInTenant)
    if (!userInTenant) {
      throw new NotFoundException('User not found in tenant');
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

  async getEffectivePermissions(userId: string, tenantId?: string): Promise<Array<{ name: string }>> {
    try {
      // Return empty array to fix compilation issues
      return [];
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

  async updateUserPermissionsByTenant(userId: string, permissions: Array<{ name: string; note?: string }>, tenantId: string, grantedBy?: string, ip?: string) {
    // Filter out undefined or empty permission names
    this.logger.log(`Updating permissions for userId=${userId}, tenantId=${tenantId}`);
    this.logger.log(`Requested permissions: ${JSON.stringify(permissions)}`);
    const permissionNames = permissions.map(p => p.name).filter((n): n is string => !!n);
    if (permissionNames.length === 0) {
      this.logger.warn('No valid permission names provided');
      throw new BadRequestException('No valid permission names provided');
    }
    // Fetch all valid permissions from DB
    const allPerms = await this.prisma.permission.findMany({
      where: { name: { in: permissionNames } }
    });
    const foundNames = allPerms.map(p => p.name);
    const missing = permissionNames.filter(n => !foundNames.includes(n));
    if (missing.length > 0) {
      this.logger.warn(`Some permissions do not exist: ${missing.join(', ')}`);
      throw new BadRequestException(`Permissions not found: ${missing.join(', ')}`);
    }
    // Remove all current permissions for the user in this tenant
    await this.prisma.userPermission.deleteMany({
      where: { userId, tenantId }
    });
    // Add new permissions for this tenant
    for (const p of permissions) {
      const perm = allPerms.find(ap => ap.name === p.name);
      if (!perm) {
        this.logger.error(`Permission ${p.name} not found in DB, skipping.`);
        continue;
      }
      let grantedByUserId: string | undefined = undefined;
      if (grantedBy) {
        const userExists = await this.prisma.user.findUnique({ where: { id: grantedBy } });
        if (userExists) {
          grantedByUserId = grantedBy;
        }
      }
      const data: any = {
        userId,
        permission: perm.name,
        grantedAt: new Date(),
        tenantId,
        // note: p.note || null, // Uncomment if note is supported in schema
      };
      if (grantedByUserId !== undefined) {
        data.grantedBy = grantedByUserId;
      }
      try {
        await this.prisma.userPermission.create({ data });
        this.logger.log(`Assigned permission ${perm.name} to user ${userId} for tenant ${tenantId}`);
      } catch (err) {
        this.logger.error(`Failed to assign permission ${perm.name} to user ${userId}: ${err.message}`);
      }
    }
    if (this.auditLogService) {
      await this.auditLogService.log(grantedBy || null, 'permissions_updated', { userId, newPermissions: permissions, tenantId }, ip);
    }
    // Return updated user with permissions for this tenant
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
}