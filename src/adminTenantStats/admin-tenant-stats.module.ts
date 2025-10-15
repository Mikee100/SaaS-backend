import { Module } from '@nestjs/common';
import { AdminTenantStatsController } from './admin-tenant-stats.controller';
import { AdminTenantStatsService } from './admin-tenant-stats.service';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminTenantStatsController],
  providers: [AdminTenantStatsService],
  exports: [AdminTenantStatsService],
})
export class AdminTenantStatsModule {}
