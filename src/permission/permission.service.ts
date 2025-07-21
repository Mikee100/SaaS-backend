import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PermissionService {
  constructor(private prisma: PrismaService) {}

  async getAllPermissions() {
    return this.prisma.permission.findMany();
  }

  async createPermission(key: string, description?: string) {
    const existing = await this.prisma.permission.findUnique({ where: { key } });
    if (existing) throw new BadRequestException('Permission already exists');
    return this.prisma.permission.create({ data: { key, description } });
  }

  // Role management methods
  async getAllRoles() {
    return this.prisma.role.findMany();
  }

  async createRole(name: string, description?: string) {
    const existing = await this.prisma.role.findUnique({ where: { name } });
    if (existing) throw new BadRequestException('Role already exists');
    return this.prisma.role.create({ data: { name, description } });
  }

  async getRolePermissions(roleId: string) {
    return this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });
  }

  async updateRolePermissions(roleId: string, permissions: { key: string }[]) {
    // Remove all current permissions
    await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    // Add new permissions
    for (const perm of permissions) {
      const permission = await this.prisma.permission.findUnique({ where: { key: perm.key } });
      if (permission) {
        await this.prisma.rolePermission.create({ data: { roleId, permissionId: permission.id } });
      }
    }
    // Return updated list
    return this.getRolePermissions(roleId);
  }
} 