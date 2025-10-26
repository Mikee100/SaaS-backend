import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { ExpenseCategoriesService } from './expense-categories.service';
import { ExpenseCategoriesController } from './expense-categories.controller';
import { RecurringExpensesScheduler } from './recurring-expenses.scheduler';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [ExpensesController, ExpenseCategoriesController],
  providers: [
    ExpensesService,
    ExpenseCategoriesService,
    RecurringExpensesScheduler,
    PrismaService,
    AuditLogService,
  ],
  exports: [ExpensesService, ExpenseCategoriesService],
})
export class ExpensesModule {}
