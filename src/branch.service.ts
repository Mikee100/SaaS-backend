import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class BranchService {
  constructor(private prisma: PrismaService) {}

  async createBranch(data: any) {
    // Accept all branch fields
    return this.prisma.branch.create({ data });
  }

  async findAllByTenant(tenantId: string) {
    return this.prisma.branch.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, tenantId: string) {
    return this.prisma.branch.findFirst({ where: { id, tenantId } });
  }

  async updateBranch(id: string, data: any, tenantId: string) {
    return this.prisma.branch.updateMany({ where: { id, tenantId }, data });
  }

  async deleteBranch(id: string, tenantId: string) {
    return this.prisma.branch.deleteMany({ where: { id, tenantId } });
  }
}
