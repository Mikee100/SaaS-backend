import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminTenantStatsService } from './admin-tenant-stats.service';
import { SuperadminGuard } from '../admin/superadmin.guard';
import { TrialGuard } from '../auth/trial.guard';

@Controller('admin/tenants/analytics')
@UseGuards(AuthGuard('jwt'), SuperadminGuard, TrialGuard)
export class AdminTenantStatsController {
  constructor(private readonly statsService: AdminTenantStatsService) {}

  @Get()
  async getTenantStats() {
    // Returns all tenant stats
    return this.statsService.getAllTenantStats();
  }
}
