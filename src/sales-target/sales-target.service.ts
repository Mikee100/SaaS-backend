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
    return this.prisma.salesTarget.create({
      data: {
        tenantId,
        daily: targets.daily,
        weekly: targets.weekly,
        monthly: targets.monthly,
        name: 'Default', // Provide a value for required 'name'
        target: 0,       // Provide a value for required 'target'
      },
    });
  }

  async updateTargets(tenantId: string, targets: { daily: number; weekly: number; monthly: number }) {
    const existing = await this.prisma.salesTarget.findFirst({
      where: { tenantId },
    });

    if (!existing) {
      return this.createTargets(tenantId, targets);
    }

    return this.prisma.salesTarget.update({
      where: { id: existing.id },
      data: {
        daily: targets.daily,
        weekly: targets.weekly,
        monthly: targets.monthly,
      },
    });
  }
}
