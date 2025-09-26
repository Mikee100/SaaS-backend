import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma.service';
import { SuperadminGuard } from './superadmin.guard';
import { ConfigurationController } from './configuration.controller';
import { ConfigurationService } from '../config/configuration.service';

@Module({
  controllers: [AdminController, ConfigurationController],
  providers: [
    AdminService,
    PrismaService,
    SuperadminGuard,
    ConfigurationService,
  ],
  exports: [AdminService, ConfigurationService],
})
export class AdminModule {}
