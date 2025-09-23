import { Controller, Get } from '@nestjs/common';
import { AdminTenantStatsService } from './admin-tenant-stats.service';

@Controller('admin/tenants/analytics')
export class AdminTenantStatsController {
  constructor(private readonly statsService: AdminTenantStatsService) {}

  @Get()
  async getTenantStats() {
    // Returns all tenant stats
    return this.statsService.getAllTenantStats();
  }
}
