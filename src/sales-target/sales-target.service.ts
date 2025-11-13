import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SalesTargetService {
  constructor(private prisma: PrismaService) {}

  async getTargets(tenantId: string) {
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

  async createTargets(tenantId: string, targets: { daily: number; weekly: number; monthly: number }) {
    return {
      daily: targets.daily,
      weekly: targets.weekly,
      monthly: targets.monthly,
    };
  }

  async updateTargets(tenantId: string, targets: { daily: number; weekly: number; monthly: number }) {
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
}
