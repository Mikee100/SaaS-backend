import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantConfigurationController } from './tenant-configuration.controller';
import { TenantConfigurationService } from '../config/tenant-configuration.service';
import { LogoService } from './logo.service';
import { PrismaService } from '../prisma.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  providers: [TenantService, TenantConfigurationService, LogoService, PrismaService],
  controllers: [TenantController, TenantConfigurationController],
  exports: [LogoService]
})
export class TenantModule {}
