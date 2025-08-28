import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { LogoService } from './logo.service';
import { TenantController } from './tenant.controller';
import { PrismaService } from '../prisma.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  providers: [TenantService, PrismaService, LogoService],
  controllers: [TenantController]
})
export class TenantModule {}
