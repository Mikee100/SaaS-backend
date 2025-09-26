import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';
import { RealtimeModule } from '../realtime.module';
import { UserModule } from '../user/user.module';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, PrismaService, AuditLogService],
  imports: [RealtimeModule, UserModule],
})
export class InventoryModule {}
