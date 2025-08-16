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
  }
}