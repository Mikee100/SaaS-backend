import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PermissionService {
  constructor(private prisma: PrismaService) {}

  async getAllPermissions() {
    return this.prisma.permission.findMany();
  }

  async createPermission(name: string, description: string) {
    const existing = await this.prisma.permission.findUnique({ 
      where: { name } 
    });
    if (existing) return existing;
    
    return this.prisma.permission.create({ 
      data: { 
        name,
        description 
      } 
    });
  }

  async seedPermissions(permissions: Array<{ name: string; description: string }>) {
    const results = [];
    
    for (const perm of permissions) {
      const existingPermission = await this.prisma.permission.findUnique({ 
        where: { name: perm.name } 
      });
      
      if (!existingPermission) {
        results.push(await this.createPermission(perm.name, perm.description));
      } else {
        results.push(existingPermission);
      }
    }
    
    return results;
  }

  // Role management methods
  async getAllRoles() {
    return this.prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    });
  }

  async createRole(name: string, description?: string) {
    const existing = await this.prisma.role.findUnique({ where: { name } });
    if (existing) throw new BadRequestException('Role already exists');
    return this.prisma.role.create({ 
      data: { 
        name, 
        description,
        createdAt: new Date(),
        updatedAt: new Date()
      } 
    });
  }

  async getRolePermissions(roleId: string) {
    return this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { 
        permission: true,
        role: true 
      },
    });
  }

  async updateRolePermissions(roleId: string, permissionNames: string[]) {
    // Get the role
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { rolePermissions: true }
    });

    if (!role) {
      throw new BadRequestException('Role not found');
    }

    // Get all permissions that match the provided names
    const permissions = await this.prisma.permission.findMany({
      where: { 
        name: { in: permissionNames }
      }
    });

    // Get current permission IDs for the role
    const currentPermissionIds = role.rolePermissions.map(rp => rp.permissionId);
    const newPermissionIds = permissions.map(p => p.id);

    // Determine which permissions to add and which to remove
    const permissionsToAdd = newPermissionIds.filter(id => !currentPermissionIds.includes(id));
    const permissionsToRemove = currentPermissionIds.filter(id => !newPermissionIds.includes(id));

    // Execute in a transaction
    return this.prisma.$transaction(async (prisma) => {
      // Remove permissions that are no longer needed
      if (permissionsToRemove.length > 0) {
        await prisma.rolePermission.deleteMany({
          where: {
            roleId,
            permissionId: { in: permissionsToRemove }
          }
        });
      }

      // Add new permissions
      if (permissionsToAdd.length > 0) {
        await prisma.rolePermission.createMany({
          data: permissionsToAdd.map(permissionId => ({
            roleId,
            permissionId,
            createdAt: new Date(),
            updatedAt: new Date()
          })),
          skipDuplicates: true
        });
      }

      // Return updated role with permissions
      return this.getRolePermissions(roleId);
    });
  }
}