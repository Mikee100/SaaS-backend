import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async createUser(data: { email: string; password: string; name: string; role: string; tenantId: string }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findAllByTenant(tenantId: string) {
    return this.prisma.user.findMany({ where: { tenantId } });
  }

  async updateUser(id: string, data: { name?: string; role?: string }, tenantId: string) {
    return this.prisma.user.updateMany({
      where: { id, tenantId },
      data,
    });
  }

  async updateUserPermissions(userId: string, permissions: Array<{ key: string; note?: string }>, grantedBy?: string) {
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
    // Return updated user with permissions
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async deleteUser(id: string, tenantId: string) {
    return this.prisma.user.deleteMany({
      where: { id, tenantId },
    });
  }

  async getUserPermissions(userId: string) {
    return this.prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });
  }
}
