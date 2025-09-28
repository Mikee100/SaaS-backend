import { Module } from '@nestjs/common';
import { AuditLogController } from '../audit-log.controller';
import { AuditLogService } from '../audit-log.service';
import { PrismaModule } from '../prisma.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
