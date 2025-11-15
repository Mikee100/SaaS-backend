import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SalaryService } from './salary.service';
import { ExpensesService } from '../expenses/expenses.service';
import { PrismaService } from '../prisma.service';

@Injectable()
export class RecurringSalariesScheduler {
  private readonly logger = new Logger(RecurringSalariesScheduler.name);

  constructor(
    private readonly salaryService: SalaryService,
    private readonly expensesService: ExpensesService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleRecurringSalaries() {
    this.logger.log('Checking for recurring salaries to process...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find all active salary schemes where nextDueDate is today or past
      const salarySchemes = await this.prisma.salaryScheme.findMany({
        where: {
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
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      this.logger.log(`Found ${salarySchemes.length} salary schemes to process`);

      for (const salaryScheme of salarySchemes) {
        try {
          // Create a new expense for this salary payment
          const expenseData = {
            amount: salaryScheme.salaryAmount,
            description: `Salary payment for ${salaryScheme.employeeName} (${salaryScheme.frequency})`,
            categoryId: await this.getOrCreateSalaryCategory(salaryScheme.tenantId),
            expenseType: 'one_time', // The expense is one-time, but salary is recurring
            branchId: salaryScheme.branchId,
            notes: `Auto-generated salary expense for ${salaryScheme.employeeName}`,
          };

          await this.expensesService.createExpense(
            expenseData,
            salaryScheme.tenantId,
            salaryScheme.userId,
          );

          // Update the nextDueDate based on frequency
          let nextDueDate = new Date(salaryScheme.nextDueDate!);

          switch (salaryScheme.frequency) {
            case 'monthly':
              nextDueDate.setMonth(nextDueDate.getMonth() + 1);
              break;
            case 'yearly':
              nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
              break;
            default:
              this.logger.warn(`Unknown frequency: ${salaryScheme.frequency} for salary scheme ${salaryScheme.id}`);
              // Skip updating nextDueDate for unknown frequency
              continue;
          }

          // Update the salary scheme with new nextDueDate and lastPaidDate
          await this.prisma.salaryScheme.update({
            where: { id: salaryScheme.id },
            data: {
              nextDueDate: nextDueDate,
              lastPaidDate: today,
              updatedAt: new Date(),
            },
          });

          this.logger.log(`Processed salary scheme ${salaryScheme.id} for ${salaryScheme.employeeName}, next due: ${nextDueDate.toISOString()}`);
        } catch (error) {
          this.logger.error(`Failed to process salary scheme ${salaryScheme.id}:`, error);
        }
      }

      this.logger.log('Recurring salaries processing completed');
    } catch (error) {
      this.logger.error('Error in recurring salaries scheduler:', error);
    }
  }

  private async getOrCreateSalaryCategory(tenantId: string): Promise<string> {
    // First, try to find existing "Salary" category
    let salaryCategory = await this.prisma.expenseCategory.findFirst({
      where: {
        tenantId,
        name: {
          equals: 'Salary',
          mode: 'insensitive',
        },
      },
    });

    if (!salaryCategory) {
      // Create the Salary category if it doesn't exist
      salaryCategory = await this.prisma.expenseCategory.create({
        data: {
          tenantId,
          name: 'Salary',
          description: 'Employee salary expenses',
          color: '#FF6B6B', // Red color for salary expenses
          isActive: true,
        },
      });
      this.logger.log(`Created Salary expense category for tenant ${tenantId}`);
    }

    return salaryCategory.id;
  }
}
