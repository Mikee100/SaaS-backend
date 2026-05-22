import { Module } from '@nestjs/common';
import { SalaryController } from './salary.controller';
import { SalaryService } from './salary.service';
import { PrismaModule } from '../prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { UserModule } from '../user/user.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { RecurringSalariesScheduler } from './recurring-salaries.scheduler';

@Module({
  imports: [PrismaModule, AuditLogModule, UserModule, ExpensesModule],
  controllers: [SalaryController],
  providers: [SalaryService, RecurringSalariesScheduler],
  exports: [SalaryService],
})
export class SalaryModule {}
