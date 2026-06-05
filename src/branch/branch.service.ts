import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { SubscriptionService } from '../billing/subscription.service';
import { restoreBranch as doRestoreBranch } from '../prisma/soft-delete-restore';

type BranchCreateData = Prisma.BranchUncheckedCreateInput & {
  tenant?: unknown;
};

@Injectable()
export class BranchService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

  async createBranch(data: BranchCreateData) {
    // Only use tenantId for linking branch to tenant
    const branchData: BranchCreateData = { ...data };
    // Remove any accidental tenant object
    if ('tenant' in branchData) {
      delete branchData.tenant;
    }
    const tenantId = branchData.tenantId;
    if (!tenantId) throw new Error('tenantId is required to create a branch');

    // Skip plan limits check for new tenant registration (trial setup)
    // Check plan limits for branches only if not during initial tenant creation
    try {
      const canAddBranch =
        await this.subscriptionService.canAddBranch(tenantId);
      if (!canAddBranch) {
        const subscription =
          await this.subscriptionService.getCurrentSubscription(tenantId);
        const maxBranches = subscription.plan?.maxBranches || 0;
        throw new ForbiddenException(
          `Branch limit exceeded. Your plan allows up to ${maxBranches} branches. Please upgrade your plan to add more branches.`,
        );
      }
    } catch (error) {
      // If no subscription found (during tenant creation), allow branch creation
      if (
        error instanceof NotFoundException &&
        /No active( or trial)? subscription found/i.test(error.message)
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
    const existingBranches = (await this.prisma.branch.findMany({
      where: { tenantId: branchData.tenantId },
      select: { id: true },
    })) as Array<{ id: string }>;

    if (existingBranches.length === 0) {
      branchData.isMainBranch = true;
    }

    return this.prisma.branch.create({
      data: branchData as Prisma.BranchUncheckedCreateInput,
    });
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

  async updateBranch(id: string, data: Prisma.BranchUncheckedUpdateInput) {
    // If updating to make this branch the main branch, unset isMainBranch for others
    if (data.isMainBranch === true) {
      const branch = (await this.prisma.branch.findUnique({
        where: { id },
        select: { tenantId: true },
      })) as { tenantId: string } | null;
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
    const branch = (await this.prisma.branch.findUnique({
      where: { id },
      select: { tenantId: true, isMainBranch: true },
    })) as { tenantId: string; isMainBranch: boolean } | null;
    if (!branch) {
      throw new Error('Branch not found');
    }

    // If deleting the main branch, make another branch the main branch
    if (branch.isMainBranch) {
      const otherBranches = (await this.prisma.branch.findMany({
        where: {
          tenantId: branch.tenantId,
          id: { not: id },
        },
        select: { id: true },
      })) as Array<{ id: string }>;

      if (otherBranches.length > 0) {
        // Make the first other branch the main branch
        await this.prisma.branch.update({
          where: { id: otherBranches[0].id },
          data: { isMainBranch: true },
        });
      }
    }

    return this.prisma.branch.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restoreBranch(id: string, tenantId: string) {
    // Ensure the branch belongs to the current tenant before restoring
    const branch = await this.prisma.branch.findFirst({
      where: { id, tenantId },
      // This query is filtered by the soft-delete extension (active branches only),
      // but we use it here only to validate tenant ownership for non-deleted branches.
    });

    if (!branch) {
      // Branch might be soft-deleted; rely on restore to enforce tenantId in SQL
      const count = await doRestoreBranch(this.prisma, id, tenantId);
      if (count === 0) {
        throw new NotFoundException('Branch not found or not deleted');
      }
      return { success: true, message: 'Branch restored successfully' };
    }

    // If branch already exists and is not deleted, nothing to restore
    return { success: true, message: 'Branch is already active' };
  }

  async updateUserBranch(userId: string, branchId: string) {
    // Verify the user exists and get their tenant
    const user = (await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true },
    })) as { tenantId: string | null } | null;

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.tenantId) {
      throw new NotFoundException('User is not associated with any tenant');
    }

    // Verify the branch exists and belongs to the same tenant
    const branch = (await this.prisma.branch.findFirst({
      where: {
        id: branchId,
        tenantId: user.tenantId,
      },
      select: { id: true },
    })) as { id: string } | null;

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
