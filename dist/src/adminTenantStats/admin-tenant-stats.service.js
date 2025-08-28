"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminTenantStatsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let AdminTenantStatsService = class AdminTenantStatsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAllTenantStats() {
        const tables = [
            'User',
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
        const tenantSpace = {};
        for (const table of tables) {
            let rows;
            if (table === 'User') {
                rows = await this.prisma.$queryRawUnsafe(`
          SELECT "tenantId", SUM(pg_column_size(t)) AS bytes_used
          FROM "User" t
          WHERE "tenantId" IS NOT NULL
          GROUP BY "tenantId";
        `);
            }
            else {
                rows = await this.prisma.$queryRawUnsafe(`
          SELECT "tenantId", SUM(pg_column_size(t)) AS bytes_used
          FROM "${table}" t
          GROUP BY "tenantId";
        `);
            }
            for (const row of rows) {
                if (!row.tenantId)
                    continue;
                if (!tenantSpace[row.tenantId])
                    tenantSpace[row.tenantId] = 0;
                tenantSpace[row.tenantId] += Number(row.bytes_used) || 0;
            }
        }
        const productCounts = await this.prisma.$queryRawUnsafe(`
      SELECT "tenantId", COUNT(*) AS product_count
      FROM "Product"
      GROUP BY "tenantId";
    `);
        const productCountMap = {};
        for (const row of productCounts) {
            if (!row.tenantId)
                continue;
            productCountMap[row.tenantId] = Number(row.product_count) || 0;
        }
        const tenants = await this.prisma.tenant.findMany();
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
};
exports.AdminTenantStatsService = AdminTenantStatsService;
exports.AdminTenantStatsService = AdminTenantStatsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminTenantStatsService);
//# sourceMappingURL=admin-tenant-stats.service.js.map