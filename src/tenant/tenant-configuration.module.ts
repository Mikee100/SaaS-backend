import { Module } from '@nestjs/common';
import { TenantConfigurationController } from './tenant-configuration.controller';
import { TenantConfigurationService } from '../config/tenant-configuration.service';
import { PrismaService } from '../prisma.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  providers: [TenantConfigurationService, PrismaService],
  controllers: [TenantConfigurationController],
  exports: [TenantConfigurationService]
})
export class TenantConfigurationModule {}
