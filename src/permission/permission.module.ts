import { Module } from '@nestjs/common';
import { PermissionController } from './permission.controller';
import { RoleController } from './role.controller';
import { PermissionService } from './permission.service';
import { PrismaService } from '../prisma.service';
import { UserModule } from '../user/user.module';

@Module({
  controllers: [PermissionController, RoleController],
  providers: [PermissionService, PrismaService],
  imports: [UserModule],
})
export class PermissionModule {}
