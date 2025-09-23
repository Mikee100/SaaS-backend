import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { LogoService } from './logo.service';
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
<<<<<<< HEAD
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
=======
  providers: [TenantService, PrismaService, LogoService],
  controllers: [TenantController]
>>>>>>> a9ab4d8c5762126916fa97fc22de1f53d95703c1
})
export class TenantModule {}
