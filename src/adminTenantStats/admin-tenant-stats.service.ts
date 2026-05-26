import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma.service';

interface TenantSpaceRow {
  tenantId: string | null;
  bytes_used: string;
}

@Injectable()
export class AdminTenantStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTenantSpace(tenantId: string): Promise<number> {
    const tables = [
      {
        name: 'User',
        displayName: 'Users',
        query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "User" t WHERE "tenantId" = $1`,
      },
      {
        name: 'Product',
        displayName: 'Products',
        query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "Product" t WHERE "tenantId" = $1`,
      },
      {
        name: 'Inventory',
        displayName: 'Inventory',
        query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "Inventory" t WHERE "tenantId" = $1`,
      },
      {
        name: 'Sale',
        displayName: 'Transactions',
        query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "Sale" t WHERE "tenantId" = $1`,
      },
      {
        name: 'MpesaTransaction',
        displayName: 'M-Pesa Transactions',
        query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "MpesaTransaction" t WHERE "tenantId" = $1`,
      },
      {
        name: 'Invoice',
        displayName: 'Invoices',
        query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "Invoice" t WHERE "tenantId" = $1`,
      },
      {
        name: 'Payment',
        displayName: 'Payments',
        query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "Payment" t WHERE "tenantId" = $1`,
      },
      {
        name: 'PaymentMethod',
        displayName: 'Payment Methods',
        query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "PaymentMethod" t WHERE "tenantId" = $1`,
      },
      {
        name: 'Branch',
        displayName: 'Branches',
        query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "Branch" t WHERE "tenantId" = $1`,
      },
      {
        name: 'Notification',
        displayName: 'Notifications',
        query: `SELECT SUM(pg_column_size(t)) AS "bytes_used" FROM "Notification" t WHERE "tenantId" = $1`,
      },
    ];

    let totalBytes = 0;
    for (const table of tables) {
      try {
        const rows: any = await this.prisma.$queryRawUnsafe(
          table.query,
          tenantId,
        );
        const bytes = rows[0]?.bytes_used ? Number(rows[0].bytes_used) : 0;
        totalBytes += bytes;
      } catch (error) {
        // Skip tables that don't exist or query fails
        console.warn(
          `Failed to query table ${table.name} for tenant ${tenantId}: ${error.message}`,
        );
      }
    }
    return totalBytes;
  }

  async getAllTenantStats() {
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
  }
}
