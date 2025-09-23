import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

interface TenantSpaceRow {
  tenantId: string | null;
  bytes_used: string;
}

interface ProductCountRow {
  tenantId: string | null;
  product_count: bigint;
}

@Injectable()
export class AdminTenantStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllTenantStats() {
    // Only tables with tenantId field
    const tables = [
      'User', // nullable tenantId
      'Product',
      'Inventory',
      'Sale',
      'MpesaTransaction',
      'Invoice',
      'Payment',
      'PaymentMethod',
      'Branch',
      'Notification'
    ];
    const tenantSpace: Record<string, number> = {};

    for (const table of tables) {
      let rows;
      if (table === 'User') {
        // User.tenantId is nullable, filter out nulls
        rows = await this.prisma.$queryRaw<TenantSpaceRow[]>(
          Prisma.sql`SELECT "tenantId", SUM(pg_column_size(t)) AS "bytes_used"
          FROM "User" t
          WHERE "tenantId" IS NOT NULL
          GROUP BY "tenantId"`
        );
      } else {
        rows = await this.prisma.$queryRaw<TenantSpaceRow[]>(
          Prisma.sql`SELECT "tenantId", SUM(pg_column_size(t)) AS "bytes_used"
          FROM "${Prisma.raw(table)}" t
          GROUP BY "tenantId"`
        );
      }
      for (const row of rows) {
        if (!row.tenantId) continue;
        if (!tenantSpace[row.tenantId]) tenantSpace[row.tenantId] = 0;
        tenantSpace[row.tenantId] += Number(row.bytes_used) || 0;
      }
    }

    // Fetch product counts per tenant
    const productCounts = await this.prisma.$queryRaw<ProductCountRow[]>(
      Prisma.sql`SELECT "tenantId", COUNT(*) AS "product_count"
      FROM "Product"
      GROUP BY "tenantId"`
    );
    const productCountMap: Record<string, number> = {};
    for (const row of productCounts) {
      if (!row.tenantId) continue;
      productCountMap[row.tenantId] = Number(row.product_count) || 0;
    }

    // Fetch all tenant metadata
    const tenants = await this.prisma.tenant.findMany();

    // Merge stats with tenant metadata
    return tenants.map(tenant => {
      const bytes = tenantSpace[tenant.id] || 0;
      return {
        ...tenant,
        tenantId: tenant.id,
        spaceUsedMB: (bytes / (1024 * 1024)).toFixed(2),
        productCount: productCountMap[tenant.id] || 0,
      };
    });
  }
}
