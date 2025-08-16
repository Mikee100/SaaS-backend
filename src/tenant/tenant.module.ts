import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantConfigurationController } from './tenant-configuration.controller';
import { TenantConfigurationService } from '../config/tenant-configuration.service';
import { LogoService } from './logo.service';
import { SectionLogoService } from './section-logo.service';
import { SectionLogoController } from './section-logo.controller';
import { PrismaService } from '../prisma.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  providers: [
    TenantService, 
    TenantConfigurationService, 
    LogoService, 
    SectionLogoService,
    PrismaService
  ],
  controllers: [
    TenantController, 
    TenantConfigurationController,
    SectionLogoController
  ],
  exports: [LogoService, SectionLogoService]
})
export class TenantModule {}
