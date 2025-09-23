import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

interface PermissionData {
  name: string;
  description: string;
}

@Injectable()
export class PermissionService {
  constructor(private prisma: PrismaService) {}

  async getAllPermissions() {
    return this.prisma.permission.findMany();
  }

<<<<<<< HEAD
  async createPermission(name: string, description: string) {
    const existing = await this.prisma.permission.findUnique({ 
      where: { name } 
    });
    if (existing) return existing;
    
    return this.prisma.permission.create({ 
      data: { 
        name,
        description,
  // createdAt: new Date(),
  // updatedAt: new Date()
      } 
    });
=======
  async createPermission(key: string, description?: string) {
  const existingArr = await this.prisma.permission.findMany({ where: { name: { equals: key } } });
  const existing = existingArr[0];
  if (existing) throw new BadRequestException('Permission already exists');
  return this.prisma.permission.create({ data: { name: key, description } });
>>>>>>> a9ab4d8c5762126916fa97fc22de1f53d95703c1
  }

  // Commenting out problematic permission creation
  /*
  async seedPermissions(permissions: PermissionData[]) {
    const results = [];
    
    for (const perm of permissions) {
      const existingPermission = await this.prisma.permission.findUnique({ 
        where: { name: perm.name } 
      });
      
      if (!existingPermission) {
        const newPermission = await this.createPermission(perm.name, perm.description);
        results.push(newPermission);
      } else {
        results.push(existingPermission);
      }
    }
    
    return results;
  }
  */

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

  async updateRole(name: string, description?: string) {
  // You must pass tenantId to this method!
  throw new Error('updateRole now requires tenantId');
  }

  async createRole(name: string, description?: string) {
<<<<<<< HEAD
    // In permission.service.ts, update the findUnique call to findFirst:
const existing = await this.prisma.role.findFirst({ 
  where: { 
    name: name,
    tenantId: null // or the appropriate tenantId if available
  } 
});
    if (existing) throw new BadRequestException('Role already exists');
    return this.prisma.role.create({ 
      data: { 
        name, 
        description,
        createdAt: new Date(),
        updatedAt: new Date()
      } 
    });
=======
  // You must pass tenantId to this method!
  throw new Error('createRole now requires tenantId');
>>>>>>> a9ab4d8c5762126916fa97fc22de1f53d95703c1
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

<<<<<<< HEAD
  // Updated method to handle role permissions
  async updateRolePermissions(roleId: string, permissionNames: string[]) {
    // Begin transaction
    return this.prisma.$transaction(async (prisma) => {
      // Delete existing role permissions
      await prisma.rolePermission.deleteMany({
        where: { roleId },
      });

      // Get permission IDs
      const permissions = await prisma.permission.findMany({
        where: {
          name: { in: permissionNames },
        },
      });

      // Create new role permissions
      const rolePermissions = await Promise.all(
        permissions.map((permission) =>
          prisma.rolePermission.create({
            data: {
              roleId,
              permissionId: permission.id,
            },
          })
        )
      );

      return rolePermissions;
    });
=======
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
>>>>>>> a9ab4d8c5762126916fa97fc22de1f53d95703c1
  }
}