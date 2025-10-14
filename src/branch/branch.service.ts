import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class BranchService {
  constructor(private prisma: PrismaService) {}

  async createBranch(data: any) {
    // Only use tenantId for linking branch to tenant
    const branchData = { ...data };
    // Remove any accidental tenant object
    if ('tenant' in branchData) delete branchData.tenant;
    if (!branchData.tenantId)
      throw new Error('tenantId is required to create a branch');

    // Set default status to 'active' if not provided
    if (!branchData.status) {
      branchData.status = 'active';
    }

    // If this is the first branch for the tenant, make it the main branch
    const existingBranches = await this.prisma.branch.findMany({
      where: { tenantId: branchData.tenantId },
    });

    if (existingBranches.length === 0) {
      branchData.isMainBranch = true;
    }

    return this.prisma.branch.create({ data: branchData });
  }

  async getAllBranches() {
    return this.prisma.branch.findMany();
  }

  async getBranchesByTenant(tenantId: string) {
    return this.prisma.branch.findMany({ where: { tenantId } });
  }

  async getBranchById(id: string) {
    return this.prisma.branch.findUnique({ where: { id } });
  }

  async updateBranch(id: string, data: any) {
    // If updating to make this branch the main branch, unset isMainBranch for others
    if (data.isMainBranch === true) {
      const branch = await this.prisma.branch.findUnique({ where: { id } });
      if (branch) {
        await this.prisma.branch.updateMany({
          where: {
            tenantId: branch.tenantId,
            id: { not: id },
          },
          data: { isMainBranch: false },
        });
      }
    }

    return this.prisma.branch.update({ where: { id }, data });
  }

  async deleteBranch(id: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      throw new Error('Branch not found');
    }

    // If deleting the main branch, make another branch the main branch
    if (branch.isMainBranch) {
      const otherBranches = await this.prisma.branch.findMany({
        where: {
          tenantId: branch.tenantId,
          id: { not: id },
        },
      });

      if (otherBranches.length > 0) {
        // Make the first other branch the main branch
        await this.prisma.branch.update({
          where: { id: otherBranches[0].id },
          data: { isMainBranch: true },
        });
      }
    }

    return this.prisma.branch.delete({ where: { id } });
  }

  async updateUserBranch(userId: string, branchId: string) {
    // Verify the user exists and get their tenant
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.tenantId) {
      throw new NotFoundException('User is not associated with any tenant');
    }

    // Verify the branch exists and belongs to the same tenant
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: branchId,
        tenantId: user.tenantId,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found or not accessible');
    }

    // Update user's current branch
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        branchId: branchId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        Branch: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });
  }
}
