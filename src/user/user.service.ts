import { Injectable } from '@nestjs/common';
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
        // ...other fields
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
        },
      });
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async getUserRoles(userId: string) {
    return this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
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
          include: { role: true }
        }
      }
    });
  }

  async updateUser(id: string, data: { name?: string; role?: string }, tenantId: string, actorUserId?: string, ip?: string) {
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

  async updateUserPermissions(userId: string, permissions: Array<{ key: string; note?: string }>, grantedBy?: string, ip?: string) {
    // Get all permissions from the Permission table
    const keys = permissions.map(p => p.key);
    const allPerms = await this.prisma.permission.findMany({ where: { key: { in: keys } } });
    // Remove all current permissions for the user
    await this.prisma.userPermission.deleteMany({ where: { userId } });
    // Add new permissions with notes, grantedBy, grantedAt
    await Promise.all(
      permissions.map(async (p) => {
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
      })
    );
    if (this.auditLogService) {
      await this.auditLogService.log(grantedBy || null, 'permissions_updated', { userId, newPermissions: permissions }, ip);
    }
    // Return updated user with permissions
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async deleteUser(id: string, tenantId: string, actorUserId?: string, ip?: string) {
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

  async getUserPermissions(userId: string) {
    return this.prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });
  }

  async updateUserByEmail(email: string, data: any) {
    return this.prisma.user.update({
      where: { email },
      data,
    });
  }

  async updateUserPreferences(userId: string, data: { notificationPreferences?: any, language?: string, region?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
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

  async getEffectivePermissions(userId: string, tenantId: string): Promise<string[]> {
    // 1. Direct user permissions
    const direct = await this.prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true }
    });
    const directPerms = direct.map((p) => p.permission.key);

    // 2. Permissions via roles
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
    const rolePerms = roles.flatMap((ur) =>
      ur.role.rolePermissions.map((rp) => rp.permission.key)
    );

    // Combine and dedupe
    return Array.from(new Set([...directPerms, ...rolePerms]));
  }
}
