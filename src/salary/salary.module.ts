import { Module } from '@nestjs/common';
import { SalaryController } from './salary.controller';
import { SalaryService } from './salary.service';
import { PrismaModule } from '../prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [PrismaModule, AuditLogModule, UserModule],
  controllers: [SalaryController],
  providers: [SalaryService],
  exports: [SalaryService],
})
export class SalaryModule {}
