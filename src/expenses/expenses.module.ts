import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [ExpensesController],
  providers: [ExpensesService, PrismaService, AuditLogService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
