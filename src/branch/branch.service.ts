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
  if (!branchData.tenantId) throw new Error('tenantId is required to create a branch');
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
    return this.prisma.branch.update({ where: { id }, data });
  }

  async deleteBranch(id: string) {
    return this.prisma.branch.delete({ where: { id } });
  }

  async updateUserBranch(userId: string, branchId: string) {
    // Verify the user exists and get their tenant
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true }
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
        tenantId: user.tenantId 
      }
    });

    if (!branch) {
      throw new NotFoundException('Branch not found or not accessible');
    }

    // Update user's current branch
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        branchId: branchId
      },
      select: {
        id: true,
        email: true,
        name: true,
        Branch: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      }
    });
  }
}
