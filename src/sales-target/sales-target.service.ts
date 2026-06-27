import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { randomUUID } from 'crypto';

type BranchTargetInput = {
  branchId: string;
  daily: number;
  weekly: number;
  monthly: number;
};

type StoredBranchTarget = BranchTargetInput;

const BRANCH_TARGETS_CONFIG_KEY = 'app.sales.branchTargets.v1';

@Injectable()
export class SalesTargetService {
  constructor(private prisma: PrismaService) {}

  private ensureTenantId(tenantId: string): void {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
  }

  async getTargets(tenantId: string) {
    this.ensureTenantId(tenantId);
    const targets = await this.prisma.salesTarget.findFirst({
      where: { tenantId },
    });

    if (!targets) {
      // Return default targets if none exist
      return {
        daily: 0,
        weekly: 0,
        monthly: 0,
      };
    }

    return {
      daily: targets.daily,
      weekly: targets.weekly,
      monthly: targets.monthly,
    };
  }

  createTargets(
    tenantId: string,
    targets: { daily: number; weekly: number; monthly: number },
  ) {
    this.ensureTenantId(tenantId);
    return {
      daily: targets.daily,
      weekly: targets.weekly,
      monthly: targets.monthly,
    };
  }

  async updateTargets(
    tenantId: string,
    targets: { daily: number; weekly: number; monthly: number },
  ) {
    this.ensureTenantId(tenantId);
    const existing = await this.prisma.salesTarget.findFirst({
      where: { tenantId },
    });

    if (!existing) {
      return this.prisma.salesTarget.create({
        data: {
          tenantId,
          daily: targets.daily,
          weekly: targets.weekly,
          monthly: targets.monthly,
          name: 'Default',
          target: 0,
        },
      });
    }

    const updated = await this.prisma.salesTarget.update({
      where: { id: existing.id },
      data: {
        daily: targets.daily,
        weekly: targets.weekly,
        monthly: targets.monthly,
      },
    });

    return {
      daily: updated.daily,
      weekly: updated.weekly,
      monthly: updated.monthly,
    };
  }

  private parseBranchTargets(value: string | null | undefined): StoredBranchTarget[] {
    if (!value) return [];

    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) return [];

      return parsed
        .map((item) => {
          const row = item as Partial<StoredBranchTarget>;
          const branchId = typeof row.branchId === 'string' ? row.branchId : '';
          if (!branchId) return null;
          return {
            branchId,
            daily: Number(row.daily || 0),
            weekly: Number(row.weekly || 0),
            monthly: Number(row.monthly || 0),
          };
        })
        .filter((item): item is StoredBranchTarget => Boolean(item));
    } catch {
      return [];
    }
  }

  async getBranchTargets(tenantId: string) {
    this.ensureTenantId(tenantId);

    const [baseTargets, branches, config] = await Promise.all([
      this.getTargets(tenantId),
      this.prisma.branch.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, name: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.tenantConfiguration.findUnique({
        where: {
          tenantId_key: {
            tenantId,
            key: BRANCH_TARGETS_CONFIG_KEY,
          },
        },
      }),
    ]);

    const configuredTargets = this.parseBranchTargets(config?.value);
    const targetByBranchId = new Map(
      configuredTargets.map((target) => [target.branchId, target]),
    );

    const branchCount = branches.length;
    const defaultDaily = branchCount > 0 ? Number(baseTargets.daily || 0) / branchCount : 0;
    const defaultWeekly = branchCount > 0 ? Number(baseTargets.weekly || 0) / branchCount : 0;
    const defaultMonthly = branchCount > 0 ? Number(baseTargets.monthly || 0) / branchCount : 0;

    return {
      branches: branches.map((branch) => {
        const configured = targetByBranchId.get(branch.id);
        return {
          branchId: branch.id,
          branchName: branch.name,
          daily: configured ? Number(configured.daily || 0) : defaultDaily,
          weekly: configured ? Number(configured.weekly || 0) : defaultWeekly,
          monthly: configured ? Number(configured.monthly || 0) : defaultMonthly,
          isExplicit: Boolean(configured),
        };
      }),
    };
  }

  async updateBranchTargets(
    tenantId: string,
    payload: { targets: BranchTargetInput[] },
  ) {
    this.ensureTenantId(tenantId);

    const targets = Array.isArray(payload?.targets) ? payload.targets : [];
    const branchIds = [...new Set(targets.map((target) => target.branchId).filter(Boolean))];

    const existingBranches = await this.prisma.branch.findMany({
      where: { tenantId, deletedAt: null, id: { in: branchIds } },
      select: { id: true },
    });
    const existingBranchIdSet = new Set(existingBranches.map((branch) => branch.id));

    const sanitizedTargets = targets
      .filter((target) => existingBranchIdSet.has(target.branchId))
      .map((target) => ({
        branchId: target.branchId,
        daily: Number(target.daily || 0),
        weekly: Number(target.weekly || 0),
        monthly: Number(target.monthly || 0),
      }));

    await this.prisma.tenantConfiguration.upsert({
      where: {
        tenantId_key: {
          tenantId,
          key: BRANCH_TARGETS_CONFIG_KEY,
        },
      },
      update: {
        value: JSON.stringify(sanitizedTargets),
        description: 'Per-branch sales targets',
        category: 'sales',
        updatedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        tenantId,
        key: BRANCH_TARGETS_CONFIG_KEY,
        value: JSON.stringify(sanitizedTargets),
        description: 'Per-branch sales targets',
        category: 'sales',
        isPublic: false,
        isEncrypted: false,
        updatedAt: new Date(),
      },
    });

    return this.getBranchTargets(tenantId);
  }
}
