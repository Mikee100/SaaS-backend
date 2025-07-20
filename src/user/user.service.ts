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
        ...data,
        password: hashedPassword,
      },
    });
    if (this.auditLogService) {
      await this.auditLogService.log(actorUserId || null, 'user_created', { createdUserId: user.id, email: user.email, role: user.role }, ip);
    }
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findAllByTenant(tenantId: string) {
    return this.prisma.user.findMany({ where: { tenantId } });
  }

  async updateUser(id: string, data: { name?: string; role?: string }, tenantId: string, actorUserId?: string, ip?: string) {
    const result = await this.prisma.user.updateMany({
      where: { id, tenantId },
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
      where: { id, tenantId },
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
}
