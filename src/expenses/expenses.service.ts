import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async createExpense(dto: any, tenantId: string, userId: string) {
    // Validate required fields
    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('Valid amount is required');
    }
    if (!dto.description?.trim()) {
      throw new BadRequestException('Description is required');
    }

    // Validate branch if provided
    let validBranchId: string | null = dto.branchId || null;
    if (dto.branchId) {
      const branchExists = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
        select: { id: true, tenantId: true },
      });
      if (!branchExists || branchExists.tenantId !== tenantId) {
        console.warn(
          `Invalid branchId ${dto.branchId} for tenant ${tenantId}, setting to null`,
        );
        validBranchId = null;
      }
    }

    const expenseId = uuidv4();
    const now = new Date();

    // Create expense record
    const expense = await this.prisma.expense.create({
      data: {
        id: expenseId,
        tenantId,
        userId,
        amount: dto.amount,
        description: dto.description.trim(),
        categoryId: dto.categoryId,
        expenseType: dto.expenseType || 'one_time',
        frequency: dto.expenseType === 'recurring' ? dto.frequency : null,
        nextDueDate:
          dto.expenseType === 'recurring'
            ? dto.nextDueDate
              ? new Date(dto.nextDueDate)
              : null
            : null,
        branchId: validBranchId,
        receiptUrl: dto.receiptUrl,
        notes: dto.notes?.trim(),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    // Audit log
    if (this.auditLogService) {
      await this.auditLogService.log(
        userId,
        'expense_created',
        {
          expenseId,
          amount: dto.amount,
          description: dto.description,
          category: dto.category,
        },
        undefined,
      );
    }

    return expense;
  }

  async getExpenses(tenantId: string, branchId?: string, query?: any) {
    const whereClause: any = { tenantId };

    // Filter by branch if specified
    if (branchId && branchId !== 'all') {
      whereClause.branchId = branchId;
    }

    // Filter by category if specified
    if (query?.category) {
      whereClause.categoryId = query.category;
    }

    // Filter by expense type if specified
    if (query?.expenseType) {
      whereClause.expenseType = query.expenseType;
    }

    // Search by description
    if (query?.search) {
      whereClause.description = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    // Filter by date range if specified
    if (query?.startDate || query?.endDate) {
      whereClause.createdAt = {};
      if (query.startDate) {
        whereClause.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        whereClause.createdAt.lte = new Date(query.endDate);
      }
    }

    // Sorting
    let orderBy: any = { createdAt: 'desc' };
    if (query?.sortBy) {
      const sortField = query.sortBy;
      const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
      orderBy = { [sortField]: sortOrder };
    }

    // Pagination
    const page = parseInt(query?.page) || 1;
    const limit = parseInt(query?.limit) || 10;
    const skip = (page - 1) * limit;

    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.expense.count({ where: whereClause }),
    ]);

    return {
      expenses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getExpenseById(id: string, tenantId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, tenantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
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

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async updateExpense(id: string, dto: any, tenantId: string) {
    // Check if expense exists and belongs to tenant
    const existingExpense = await this.prisma.expense.findFirst({
      where: { id, tenantId },
    });

    if (!existingExpense) {
      throw new NotFoundException('Expense not found');
    }

    // Validate branch if provided
    let validBranchId: string | null = dto.branchId || existingExpense.branchId;
    if (dto.branchId) {
      const branchExists = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
        select: { id: true, tenantId: true },
      });
      if (!branchExists || branchExists.tenantId !== tenantId) {
        console.warn(
          `Invalid branchId ${dto.branchId} for tenant ${tenantId}, keeping existing`,
        );
        validBranchId = existingExpense.branchId;
      }
    }

    const updatedExpense = await this.prisma.expense.update({
      where: { id },
      data: {
        amount: dto.amount,
        description: dto.description?.trim(),
        category: dto.category,
        expenseType: dto.expenseType,
        frequency: dto.expenseType === 'recurring' ? dto.frequency : null,
        nextDueDate:
          dto.expenseType === 'recurring'
            ? dto.nextDueDate
              ? new Date(dto.nextDueDate)
              : null
            : null,
        branchId: validBranchId,
        receiptUrl: dto.receiptUrl,
        notes: dto.notes?.trim(),
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
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

    return updatedExpense;
  }

  async deleteExpense(id: string, tenantId: string) {
    // Check if expense exists and belongs to tenant
    const existingExpense = await this.prisma.expense.findFirst({
      where: { id, tenantId },
    });

    if (!existingExpense) {
      throw new NotFoundException('Expense not found');
    }

    // Soft delete by setting isActive to false
    await this.prisma.expense.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return { success: true, message: 'Expense deleted successfully' };
  }

  async getExpenseAnalytics(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    // Set default date range if not provided (last 30 days)
    const end = endDate || new Date();
    const start = startDate || new Date();
    start.setDate(start.getDate() - 30);

    // Get all expenses in the date range
    const expenses = await this.prisma.expense.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end,
        },
        isActive: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Calculate analytics
    const totalExpenses = expenses.length;
    const totalAmount = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );
    const avgExpenseAmount =
      totalExpenses > 0 ? totalAmount / totalExpenses : 0;

    // Expenses by category
    const expensesByCategory: Record<
      string,
      { count: number; amount: number }
    > = {};
    expenses.forEach((expense) => {
      const category = expense.category?.name || 'Uncategorized';
      if (!expensesByCategory[category]) {
        expensesByCategory[category] = { count: 0, amount: 0 };
      }
      expensesByCategory[category].count++;
      expensesByCategory[category].amount += expense.amount;
    });

    // Expenses by type
    const expensesByType: Record<string, { count: number; amount: number }> =
      {};
    expenses.forEach((expense) => {
      const type = expense.expenseType;
      if (!expensesByType[type]) {
        expensesByType[type] = { count: 0, amount: 0 };
      }
      expensesByType[type].count++;
      expensesByType[type].amount += expense.amount;
    });

    // Expenses by month
    const expensesByMonth: Record<string, number> = {};
    expenses.forEach((expense) => {
      const month = expense.createdAt.toISOString().slice(0, 7); // YYYY-MM
      expensesByMonth[month] = (expensesByMonth[month] || 0) + expense.amount;
    });

    return {
      totalExpenses,
      totalAmount,
      avgExpenseAmount,
      expensesByCategory,
      expensesByType,
      expensesByMonth,
    };
  }

  async getExpenseCategories(tenantId: string) {
    const categories = await this.prisma.expenseCategory.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    return categories;
  }

  async getBranchComparison(tenantId: string, startDate?: Date, endDate?: Date) {
    // Set default date range if not provided (last 30 days)
    const end = endDate || new Date();
    const start = startDate || new Date();
    start.setDate(start.getDate() - 30);

    // Get expenses grouped by branch
    const expenses = await this.prisma.expense.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end,
        },
        isActive: true,
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Group expenses by branch
    const branchData: Record<string, {
      branchName: string;
      totalAmount: number;
      expenseCount: number;
      categories: Record<string, number>;
      expenses: any[];
    }> = {};

    expenses.forEach((expense) => {
      const branchId = expense.branchId || 'unassigned';
      const branchName = expense.branch?.name || 'Unassigned Branch';

      if (!branchData[branchId]) {
        branchData[branchId] = {
          branchName,
          totalAmount: 0,
          expenseCount: 0,
          categories: {},
          expenses: [],
        };
      }

      branchData[branchId].totalAmount += expense.amount;
      branchData[branchId].expenseCount += 1;
      branchData[branchId].expenses.push({
        id: expense.id,
        amount: expense.amount,
        description: expense.description,
        category: expense.category?.name || 'Uncategorized',
        createdAt: expense.createdAt,
      });

      // Track by category
      const category = expense.category?.name || 'Uncategorized';
      branchData[branchId].categories[category] =
        (branchData[branchId].categories[category] || 0) + expense.amount;
    });

    return {
      branches: Object.values(branchData),
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    };
  }

  async resetMonthlyExpenses(tenantId: string, userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get all expenses for current month
    const monthlyExpenses = await this.prisma.expense.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        isActive: true,
      },
    });

    if (monthlyExpenses.length === 0) {
      throw new BadRequestException('No expenses found for current month to reset');
    }

    // Calculate monthly summary
    const totalAmount = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const expenseCount = monthlyExpenses.length;

    // Create monthly archive record (assuming we have a MonthlyExpenseArchive table)
    // For now, we'll create a summary log
    const archiveData = {
      tenantId,
      userId,
      month: startOfMonth.toISOString().slice(0, 7), // YYYY-MM
      totalAmount,
      expenseCount,
      archivedAt: now,
      expenseIds: monthlyExpenses.map(exp => exp.id),
    };

    // Note: This would require adding a MonthlyExpenseArchive table to the schema
    // For now, we'll just log the reset action
    if (this.auditLogService) {
      await this.auditLogService.log(
        userId,
        'monthly_expenses_reset',
        archiveData,
        undefined,
      );
    }

    // Soft delete current month's expenses
    await this.prisma.expense.updateMany({
      where: {
        tenantId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        isActive: true,
      },
      data: {
        isActive: false,
        updatedAt: now,
      },
    });

    return {
      success: true,
      message: `Monthly expenses reset successfully. Archived ${expenseCount} expenses totaling $${totalAmount.toFixed(2)}`,
      summary: {
        month: archiveData.month,
        totalAmount,
        expenseCount,
      },
    };
  }

  async getPastMonthsRecords(tenantId: string, months: number = 12) {
    const now = new Date();
    const records: Array<{
      month: string;
      monthName: string;
      totalAmount: number;
      expenseCount: number;
      categories: Record<string, number>;
      branches: Record<string, number>;
      expenses: any[];
    }> = [];

    for (let i = 0; i < months; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);

      const expenses = await this.prisma.expense.findMany({
        where: {
          tenantId,
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          isActive: true,
        },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const expenseCount = expenses.length;

      // Group by category
      const categories: Record<string, number> = {};
      expenses.forEach(exp => {
        const category = exp.category?.name || 'Uncategorized';
        categories[category] = (categories[category] || 0) + exp.amount;
      });

      // Group by branch
      const branches: Record<string, number> = {};
      expenses.forEach(exp => {
        const branch = exp.branch?.name || 'Unassigned Branch';
        branches[branch] = (branches[branch] || 0) + exp.amount;
      });

      records.push({
        month: startOfMonth.toISOString().slice(0, 7), // YYYY-MM
        monthName: startOfMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
        totalAmount,
        expenseCount,
        categories,
        branches,
        expenses: expenses.slice(0, 10), // Include first 10 expenses for details
      });
    }

    return {
      records: records.reverse(), // Most recent first
      totalMonths: months,
    };
  }
}
