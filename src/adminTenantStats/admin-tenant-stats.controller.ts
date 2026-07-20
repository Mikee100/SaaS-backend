import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRole } from '@prisma/client';
import { AdminTenantStatsService } from './admin-tenant-stats.service';
import { AdminRoleGuard } from '../admin/admin-role.guard';
import { AdminRoles } from '../admin/admin-roles.decorator';
import { TrialGuard } from '../auth/trial.guard';

@Controller('admin/tenants/analytics')
@UseGuards(AuthGuard('jwt'), AdminRoleGuard, TrialGuard)
@AdminRoles(AdminRole.SUPPORT, AdminRole.BILLING)
export class AdminTenantStatsController {
  constructor(private readonly statsService: AdminTenantStatsService) {}

  @Get()
  async getTenantStats() {
    // Returns all tenant stats
    return this.statsService.getAllTenantStats();
  }
}
