import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { ExpenseCategoriesService } from './expense-categories.service';
import { ExpenseCategoriesController } from './expense-categories.controller';
import { RecurringExpensesScheduler } from './recurring-expenses.scheduler';
import { AuditLogService } from '../audit-log.service';
import { UserModule } from '../user/user.module';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [UserModule, LedgerModule],
  controllers: [ExpensesController, ExpenseCategoriesController],
  providers: [
    ExpensesService,
    ExpenseCategoriesService,
    RecurringExpensesScheduler,
    AuditLogService,
  ],
  exports: [ExpensesService, ExpenseCategoriesService],
})
export class ExpensesModule {}
