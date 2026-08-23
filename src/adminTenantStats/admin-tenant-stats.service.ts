import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AdminTenantStatsService {
  private readonly logger = new Logger(AdminTenantStatsService.name);
  private readonly estimatedBytesPerRecord = {
    users: 1200,
    products: 1800,
    sales: 1600,
    branches: 900,
  } as const;

  constructor(private readonly prisma: PrismaService) {}

  async getTenantSpace(tenantId: string): Promise<number> {
    const [userCount, productCount, salesCount, branchCount] =
      await Promise.all([
        this.prisma.user.count({ where: { tenantId } }),
        this.prisma.product.count({ where: { tenantId, deletedAt: null } }),
        this.prisma.sale.count({ where: { tenantId } }),
        this.prisma.branch.count({ where: { tenantId } }),
      ]);

    return (
      userCount * this.estimatedBytesPerRecord.users +
      productCount * this.estimatedBytesPerRecord.products +
      salesCount * this.estimatedBytesPerRecord.sales +
      branchCount * this.estimatedBytesPerRecord.branches
    );
  }

  async getAllTenantStats() {
    try {
      // Fetch all tenant metadata
      const tenants = await this.prisma.tenant.findMany();

      // Calculate space for each tenant using the same method as getTenantById
      const tenantStats = await Promise.all(
        tenants.map(async (tenant) => {
          const [bytes, activeVariationCount, nonVariationProductCount] =
            await Promise.all([
              this.getTenantSpace(tenant.id),
              this.prisma.productVariation.count({
                where: {
                  tenantId: tenant.id,
                  isActive: true,
                  deletedAt: null,
                },
              }),
              this.prisma.product.count({
                where: {
                  tenantId: tenant.id,
                  deletedAt: null,
                  variations: {
                    none: {
                      isActive: true,
                      deletedAt: null,
                    },
                  },
                },
              }),
            ]);

          const productCount = activeVariationCount + nonVariationProductCount;

          return {
            ...tenant,
            tenantId: tenant.id,
            spaceUsedMB: (bytes / (1024 * 1024)).toFixed(2),
            productCount,
          };
        }),
      );

      return tenantStats;
    } catch (error) {
      if (this.isTransientPrismaConnectionError(error)) {
        this.logger.warn(
          'Database is temporarily unreachable while computing tenant stats. Returning an empty stats list.',
        );
        return [];
      }

      throw error;
    }
  }

  private isTransientPrismaConnectionError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const prismaError = error as { code?: string; message?: string };
    if (prismaError.code === 'P1001' || prismaError.code === 'P2024') {
      return true;
    }

    const msg = (prismaError.message || '').toLowerCase();
    return (
      msg.includes("can't reach database server") ||
      msg.includes('timed out fetching a new connection from the connection pool')
    );
  }

}
