import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PermissionService {
  constructor(private prisma: PrismaService) {}

  async getAllPermissions() {
    return this.prisma.permission.findMany();
  }

  async createPermission(key: string, description?: string) {
  const existingArr = await this.prisma.permission.findMany({ where: { name: { equals: key } } });
  const existing = existingArr[0];
  if (existing) throw new BadRequestException('Permission already exists');
  return this.prisma.permission.create({ data: { name: key, description } });
  }

  // Role management methods
  async getAllRoles() {
    return this.prisma.role.findMany();
  }

  async updateRole(name: string, description?: string) {
  // You must pass tenantId to this method!
  throw new Error('updateRole now requires tenantId');
  }

  async createRole(name: string, description?: string) {
  // You must pass tenantId to this method!
  throw new Error('createRole now requires tenantId');
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
      const permissionArr = await this.prisma.permission.findMany({ where: { name: { equals: perm.key } } });
      const permission = permissionArr[0];
      if (permission) {
        await this.prisma.rolePermission.create({ data: { roleId, permissionId: permission.id } });
      }
    }
    // Return updated list
    return this.getRolePermissions(roleId);
  }
} 