import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SubscriptionService } from '../billing/subscription.service';

@Injectable()
export class BranchService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

  async createBranch(data: any) {
    // Only use tenantId for linking branch to tenant
    const branchData = { ...data };
    // Remove any accidental tenant object
    if ('tenant' in branchData) delete branchData.tenant;
    if (!branchData.tenantId)
      throw new Error('tenantId is required to create a branch');

    // Skip plan limits check for new tenant registration (trial setup)
    // Check plan limits for branches only if not during initial tenant creation
    try {
      const canAddBranch = await this.subscriptionService.canAddBranch(
        branchData.tenantId,
      );
      if (!canAddBranch) {
        const subscription =
          await this.subscriptionService.getCurrentSubscription(
            branchData.tenantId,
          );
        const maxBranches = subscription.plan?.maxBranches || 0;
        throw new ForbiddenException(
          `Branch limit exceeded. Your plan allows up to ${maxBranches} branches. Please upgrade your plan to add more branches.`,
        );
      }
    } catch (error) {
      // If no subscription found (during tenant creation), allow branch creation
      if (
        error instanceof NotFoundException &&
        error.message.includes('No active subscription found')
      ) {
        // Allow branch creation for new tenants
      } else {
        throw error;
      }
    }

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
