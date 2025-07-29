import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma.service';
import { SuperadminGuard } from './superadmin.guard';

@Module({
  controllers: [AdminController],
  providers: [AdminService, PrismaService, SuperadminGuard],
  exports: [AdminService],
})
export class AdminModule {} 