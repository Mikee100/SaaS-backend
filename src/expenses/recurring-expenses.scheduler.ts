import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExpensesService } from './expenses.service';
import { PrismaService } from '../prisma.service';

@Injectable()
export class RecurringExpensesScheduler {
  private readonly logger = new Logger(RecurringExpensesScheduler.name);

  constructor(
    private readonly expensesService: ExpensesService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleRecurringExpenses() {
    this.logger.log('Checking for recurring expenses to process...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find all active recurring expenses where nextDueDate is today or past
      const recurringExpenses = await this.prisma.expense.findMany({
        where: {
          expenseType: 'recurring',
          isActive: true,
          nextDueDate: {
            lte: today,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              tenantId: true,
            },
          },
        },
      });

      this.logger.log(`Found ${recurringExpenses.length} recurring expenses to process`);

      for (const expense of recurringExpenses) {
        try {
          // Create a new expense based on the recurring one
          const newExpenseData = {
            amount: expense.amount,
            description: `${expense.description} (Recurring - ${expense.frequency})`,
            category: expense.categoryId,
            expenseType: 'one_time', // The new one is one-time
            branchId: expense.branchId,
            receiptUrl: expense.receiptUrl,
            notes: expense.notes,
          };

          await this.expensesService.createExpense(
            newExpenseData,
            expense.tenantId,
            expense.userId,
          );

          // Update the nextDueDate based on frequency
          let nextDueDate = new Date(expense.nextDueDate!);

          switch (expense.frequency) {
            case 'daily':
              nextDueDate.setDate(nextDueDate.getDate() + 1);
              break;
            case 'weekly':
              nextDueDate.setDate(nextDueDate.getDate() + 7);
              break;
            case 'monthly':
              nextDueDate.setMonth(nextDueDate.getMonth() + 1);
              break;
            case 'yearly':
              nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
              break;
            default:
              this.logger.warn(`Unknown frequency: ${expense.frequency} for expense ${expense.id}`);
              // Skip updating nextDueDate for unknown frequency
              continue;
          }

          // Update the original recurring expense with new nextDueDate
          await this.prisma.expense.update({
            where: { id: expense.id },
            data: {
              nextDueDate: nextDueDate,
              updatedAt: new Date(),
            },
          });

          this.logger.log(`Processed recurring expense ${expense.id}, next due: ${nextDueDate.toISOString()}`);
        } catch (error) {
          this.logger.error(`Failed to process recurring expense ${expense.id}:`, error);
        }
      }

      this.logger.log('Recurring expenses processing completed');
    } catch (error) {
      this.logger.error('Error in recurring expenses scheduler:', error);
    }
  }
}
