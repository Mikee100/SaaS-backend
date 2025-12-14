import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuditLogService } from '../audit-log.service';
import { SubscriptionService } from '../billing/subscription.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class UserService {
  async updateUserPermissions(
    userId: string,
    permissions: string[],
    tenantId: string,
    actorUserId?: string,
    ip?: string,
  ) {
    // ...existing code...
    // Remove all direct user permissions for this user in this tenant
    await this.prisma.userPermission.deleteMany({
      where: { userId, tenantId },
    });
    // Add new permissions
    for (const permKey of permissions) {
      if (!permKey) {
        this.logger.warn(`Skipped empty permission key for user ${userId}`);
        continue;
      }
      const perm = await this.prisma.permission.findFirst({
        where: { name: permKey },
      });
      if (perm) {
        this.logger.log(
          `Assigning permission '${permKey}' (id: ${perm.id}) to user ${userId} for tenant ${tenantId}`,
        );
        await this.prisma.userPermission.create({
          data: { userId, tenantId, permission: perm.name },
        });
      } else {
        this.logger.warn(
          `Permission '${permKey}' not found in Permission table for user ${userId}`,
        );
      }
    }
    // Log the action
    if (this.auditLogService) {
      await this.auditLogService.log(
        actorUserId || null,
        'user_permissions_updated',
        { userId, permissions },
        ip,
      );
    }
    return { success: true };
  }
  async findById(id: string, options: { include?: Prisma.UserInclude } = {}) {
    const defaultInclude: Prisma.UserInclude = {
      userRoles: {
        include: {
          role: true,
        },
      },
    };

    return this.prisma.user.findUnique({
      where: { id },
      include: options.include || defaultInclude,
    });
  }
  private readonly logger = new Logger(UserService.name);

  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private subscriptionService: SubscriptionService,
  ) {}

  // ...existing code...

  async createUser(
    data: {
      email: string;
      password: string;
      name: string;
      role: string;
      tenantId: string;
      branchId?: string;
    },
    actorUserId?: string,
    ip?: string,
    prismaClient?: Prisma.TransactionClient,
  ) {
    const prisma = prismaClient || this.prisma;

    // Check if tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: data.tenantId },
    });
    if (!tenant) {
      throw new BadRequestException(
        `Tenant with id '${data.tenantId}' does not exist. Cannot create user.`,
      );
    }

    // Skip plan limits check for new tenant registration (trial setup)
    // Check plan limits for users only if not during initial tenant creation
    try {
      const canAddUser = await this.subscriptionService.canAddUser(
        data.tenantId,
      );
      if (!canAddUser) {
        const subscription =
          await this.subscriptionService.getCurrentSubscription(data.tenantId);
        const maxUsers = subscription.plan?.maxUsers || 0;
        throw new ForbiddenException(
          `User limit exceeded. Your plan allows up to ${maxUsers} users. Please upgrade your plan to add more users.`,
        );
      }
    } catch (error) {
      // If no subscription found (during tenant creation), allow user creation
      if (
        error instanceof NotFoundException &&
        error.message.includes('No active subscription found')
      ) {
        // Allow user creation for new tenants
      } else {
        throw error;
      }
    }

    // Normalize email (lowercase and trim) to ensure consistency
    const normalizedEmail = data.email.toLowerCase().trim();

    // Check if user with this email already exists in any tenant
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, tenantId: true },
    });

    if (existingUser) {
      throw new BadRequestException(
        `A user with email '${normalizedEmail}' already exists. ` +
          `Please use a different email address or contact support if you need assistance.`,
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create the user with normalized email
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: normalizedEmail,
        password: hashedPassword,
        tenantId: data.tenantId,
        branchId: data.branchId,
      },
    });
    this.logger.log(`Created user: ${user.id}, tenant: ${data.tenantId}`);

    // Find the role for this tenant using composite unique constraint
    let role = await prisma.role.findUnique({
      where: { name_tenantId: { name: data.role, tenantId: data.tenantId } },
    });
    if (!role) {
      // Create the role if it doesn't exist
      role = await prisma.role.create({
        data: {
          name: data.role,
          description: `${data.role.charAt(0).toUpperCase() + data.role.slice(1)} role`,
          tenantId: data.tenantId,
        },
      });
      this.logger.log(
        `Created role: ${role.id}, name: ${role.name}, tenant: ${data.tenantId}`,
      );
    }
    // Assign role to user
    const userRole = await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
        tenantId: data.tenantId,
      },
    });
    this.logger.log(
      `Assigned role to user: userRoleId=${userRole.id}, userId=${user.id}, roleId=${role.id}, tenantId=${data.tenantId}`,
    );

    // Automatically assign all permissions to owner role
    if (role.name === 'owner') {
      const permissions = await prisma.permission.findMany();
      for (const perm of permissions) {
        const exists = await prisma.rolePermission.findFirst({
          where: { roleId: role.id, permissionId: perm.id },
        });
        if (!exists) {
          await prisma.rolePermission.create({
            data: {
              roleId: role.id,
              permissionId: perm.id,
            },
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
        ip,
      );
    }

    return user;
  }

  async findByEmail(email: string, include?: Prisma.UserInclude) {
    try {
      // Normalize email (lowercase and trim) to ensure consistency
      const normalizedEmail = email.toLowerCase().trim();

      const defaultInclude: Prisma.UserInclude = {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
            tenant: true,
          },
        },
      };

      // If no custom include is provided, use the default one
      const queryInclude = include || defaultInclude;

      this.logger.log(`Querying database for user with email: ${normalizedEmail}`);

      try {
        const user = await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: queryInclude,
        });

        if (user) {
          this.logger.log(`Found user: ${user.id} with email: ${normalizedEmail}`);
          return user;
        } else {
          this.logger.warn(`No user found with email: ${normalizedEmail}`);
          return null;
        }
      } catch (error) {
        // If the error is about the isActive column not existing, try without it
        if (
          error instanceof Error &&
          'code' in error &&
          error.code === 'P2022' &&
          'meta' in error &&
          error.meta &&
          typeof error.meta === 'object' &&
          'column' in error.meta &&
          error.meta.column === 'User.isActive'
        ) {
          this.logger.warn(
            'isActive column not found, falling back to basic user query',
          );

          // Try with a more basic query that doesn't rely on isActive
          const basicUser = await this.prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              tenantId: true,
              branchId: true,
              // Include other essential fields here
            },
          });

          if (basicUser) {
            // Manually add isActive as true for backward compatibility
            return { ...basicUser, isActive: true };
          }
          return null;
        }
        throw error; // Re-throw if it's a different error
      }
    } catch (error) {
      console.error(`Error in findByEmail for ${email}:`, error);
      throw error;
    }
  }

  async getUserRoles(tenantId: string) {
    return this.prisma.role.findMany({
      where: { tenantId },
      include: {
        permissions: true,
        tenant: true,
      },
    });
  }

  async findAllByTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: {
        userRoles: {
          some: { tenantId },
        },
      },
      include: {
        userRoles: {
          include: {
            role: true,
            tenant: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      include: {
        userRoles: {
          include: {
            role: true,
            tenant: true,
          },
        },
      },
    });
  }

  async findByTenantAndBranch(tenantId: string, branchId: string | null) {
    // If branchId is "unassigned" or null, fetch users with branchId IS NULL
    const where: Prisma.UserWhereInput = { tenantId };
    if (branchId === 'unassigned' || branchId === null) {
      where.branchId = null;
    } else {
      where.branchId = branchId;
    }

    return this.prisma.user.findMany({
      where,
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async updateUser(
    id: string,
    data: { name?: string; role?: string },
    tenantId: string,
    actorUserId?: string,
    ip?: string,
  ): Promise<{ count: number }> {
    // If role is being updated, handle role assignment
    if (data.role) {
      const role = await this.prisma.role.findUnique({
        where: { name_tenantId: { name: data.role, tenantId } },
      });
      if (!role) {
        throw new NotFoundException(
          `Role '${data.role}' not found for tenant ${tenantId}`,
        );
      }

      await this.prisma.userRole.upsert({
        where: {
          userId_roleId_tenantId: {
            userId: id,
            roleId: role.id,
            tenantId: tenantId,
          },
        },
        update: {
          roleId: role.id,
        },
        create: {
          userId: id,
          roleId: role.id,
          tenantId: tenantId,
        },
      });
      // Remove role from data to prevent updating it directly
      delete data.role;
    }

    // Update user data if there's anything left to update
    let result: { count: number };
    if (Object.keys(data).length > 0) {
      result = await this.prisma.user.updateMany({
        where: {
          id,
          userRoles: {
            some: { tenantId },
          },
        },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    } else {
      result = { count: 1 };
    }

    if (this.auditLogService) {
      await this.auditLogService.log(
        actorUserId || null,
        'user_updated',
        { userId: id, updatedFields: data },
        ip,
      );
    }

    return result;
  }

  async updateUserByEmail(
    email: string,
    data: Partial<Prisma.UserUpdateInput>,
  ) {
    return this.prisma.user.update({
      where: { email },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async updateUserPreferences(
    userId: string,
    data: {
      notificationPreferences?: Prisma.InputJsonValue;
      language?: string;
      region?: string;
      branchId?: string;
    },
  ) {
    // Accept branchId in preferences update
    const updateData: Prisma.UserUpdateInput = {
      ...data,
      ...(data.branchId !== undefined ? { branchId: data.branchId } : {}),
      updatedAt: new Date(),
    };
    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
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
        updatedAt: new Date(),
      },
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    // Get user with password hash
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    return { success: true, message: 'Password updated successfully' };
  }

  // ...existing code...

  async getEffectivePermissions(
    userId: string,
    tenantId?: string,
  ): Promise<Array<{ name: string }>> {
    try {
      // Get user with roles
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: {
            include: { role: true },
          },
        },
      });

      if (!user) return [];

      // Check if user has owner role
      const isOwner = user.userRoles.some(
        (ur) =>
          ur.role?.name?.toLowerCase() === 'owner' ||
          ur.role?.name?.toLowerCase() === 'admin',
      );

      if (isOwner) {
        // Return all permissions in the system
        const allPerms = await this.prisma.permission.findMany();
        return allPerms.map((p) => ({ name: p.name }));
      }

      // Prepare where clause for permissions query
      const permissionWhere: Prisma.UserPermissionWhereInput = { userId };
      if (tenantId) {
        permissionWhere.tenantId = tenantId;
      }
      this.logger.log(
        `Direct userPermission where clause: ${JSON.stringify(permissionWhere)}`,
      );

      // Get direct user permissions
      const directUserPermissions = await this.prisma.userPermission.findMany({
        where: permissionWhere,
        include: { permissionRef: true },
      });
      this.logger.log(
        `Direct user permissions found: ${directUserPermissions.length}`,
      );

      // Get permissions from user's roles
      const roleIds = user.userRoles.map((ur) => ur.role?.id).filter(Boolean);
      this.logger.log(`User roleIds: ${JSON.stringify(roleIds)}`);
      let rolePermissions: Prisma.RolePermissionGetPayload<{
        include: { permission: true };
      }>[] = [];

      if (roleIds.length > 0) {
        const roleWhere: Prisma.RolePermissionWhereInput = {
          roleId: { in: roleIds },
        };
        if (tenantId) {
          roleWhere.AND = [{ role: { tenantId } }, { roleId: { in: roleIds } }];
        }
        this.logger.log(
          `RolePermission where clause: ${JSON.stringify(roleWhere)}`,
        );
        rolePermissions = await this.prisma.rolePermission.findMany({
          where: roleWhere,
          include: { permission: true },
        });
        this.logger.log(`Role permissions found: ${rolePermissions.length}`);
      }

      // Combine and deduplicate permissions
      const allPermissions = [
        ...directUserPermissions
          .filter((up) => up.permissionRef?.name)
          .map((up) => up.permissionRef.name),
        ...rolePermissions
          .filter((rp) => rp.permission?.name)
          .map((rp) => rp.permission.name),
      ];

      const uniquePermissions = Array.from(new Set(allPermissions));
      this.logger.log(
        `Unique permissions for user: ${JSON.stringify(uniquePermissions)}`,
      );
      return uniquePermissions.map((name) => ({ name }));
    } catch (error) {
      this.logger.error(
        `Error getting effective permissions for user ${userId}:`,
        error,
      );
      return [];
    }
  }

  // ...existing code...

  async getUserById(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          userRoles: {
            select: {
              role: true,
              tenant: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Transform userRoles to match expected format
      const transformedUser = {
        ...user,
        roles: user.userRoles.map((ur) => ({
          ...ur.role,
          tenant: ur.tenant,
        })),
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

  async deleteUser(
    id: string,
    tenantId: string,
    actorUserId?: string,
    ip?: string,
  ) {
    // First remove user roles for this tenant
    await this.prisma.userRole.deleteMany({
      where: {
        userId: id,
        tenantId,
      },
    });

    // Remove user permissions for this tenant
    await this.prisma.userPermission.deleteMany({
      where: {
        userId: id,
        tenantId,
      },
    });

    // Check if user has any remaining roles
    const remainingRoles = await this.prisma.userRole.count({
      where: { userId: id },
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
      await this.auditLogService.log(
        actorUserId || null,
        'user_deleted',
        { userId: id, tenantId },
        ip,
      );
    }

    return result;
  }

  async getAllPermissions() {
    return this.prisma.permission.findMany({
      select: { name: true },
    });
  }

  async getPlanLimits(tenantId: string): Promise<unknown> {
    const result = await this.subscriptionService.getPlanLimits(tenantId);

    return result;
  }

  async adminResetPassword(
    userId: string,
    actorUserId?: string,
    ip?: string,
  ): Promise<{ newPassword: string; user: any }> {
    // Find the user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate a new random password
    const newPassword = this.generateRandomPassword();

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    // Log the action
    if (this.auditLogService) {
      await this.auditLogService.log(
        actorUserId || null,
        'admin_password_reset',
        { targetUserId: userId, targetUserEmail: user.email },
        ip,
      );
    }

    return { newPassword, user: updatedUser };
  }

  private generateRandomPassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}
