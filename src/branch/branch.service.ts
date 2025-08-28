import { Injectable } from '@nestjs/common';
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
}
