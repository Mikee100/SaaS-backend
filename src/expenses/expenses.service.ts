import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';
import { LedgerService } from '../ledger/ledger.service';
import { v4 as uuidv4 } from 'uuid';

type ExpenseMutationInput = {
  amount?: number | string;
  description?: string;
  categoryId?: string;
  category?: string;
  expenseType?: string;
  frequency?: string;
  nextDueDate?: string | Date;
  branchId?: string;
  receiptUrl?: string;
  notes?: string;
  paymentMethod?: string;
};

type ExpenseListQuery = {
  category?: string;
  expenseType?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: string;
  limit?: string;
};

type ExpensePreview = {
  id: string;
  amount: number;
  description: string;
  category: string;
  createdAt: Date;
};

type ExpenseSortableField =
  | 'createdAt'
  | 'amount'
  | 'description'
  | 'expenseType';

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private ledgerService: LedgerService,
  ) {}

  private getTrimmedString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private getPositiveNumber(value: unknown): number | undefined {
    const numberValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numberValue) || numberValue <= 0) {
      return undefined;
    }
    return numberValue;
  }

  private parseDate(value: unknown): Date | undefined {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }
    if (typeof value !== 'string' || !value.trim()) {
      return undefined;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private parseSortField(value?: string): ExpenseSortableField | undefined {
    if (!value) {
      return undefined;
    }
    const allowed: ExpenseSortableField[] = [
      'createdAt',
      'amount',
      'description',
      'expenseType',
    ];
    return allowed.includes(value as ExpenseSortableField)
      ? (value as ExpenseSortableField)
      : undefined;
  }

  private async resolveCategoryId(
    tenantId: string,
    dto: ExpenseMutationInput,
  ): Promise<string | null> {
    const rawCategoryId = this.getTrimmedString(dto.categoryId) || null;
    const rawCategory = this.getTrimmedString(dto.category) || null;

    const candidate = rawCategoryId || rawCategory;
    if (!candidate) return null;

    // Accept either category ID or category name from older clients.
    const category = await this.prisma.expenseCategory.findFirst({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { id: candidate },
          { name: { equals: candidate, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    return category?.id || null;
  }

  async createExpense(
    dto: ExpenseMutationInput,
    tenantId: string,
    userId: string,
  ) {
    const amount = this.getPositiveNumber(dto.amount);
    const description = this.getTrimmedString(dto.description);

    // Validate required fields
    if (!amount) {
      throw new BadRequestException('Valid amount is required');
    }
    if (!description) {
      throw new BadRequestException('Description is required');
    }

    // Validate branch if provided
    const dtoBranchId = this.getTrimmedString(dto.branchId);
    let validBranchId: string | null = dtoBranchId || null;
    if (dtoBranchId) {
      const branchExists = await this.prisma.branch.findUnique({
        where: { id: dtoBranchId },
        select: { id: true, tenantId: true },
      });
      if (!branchExists || branchExists.tenantId !== tenantId) {
        console.warn(
          `Invalid branchId ${dtoBranchId} for tenant ${tenantId}, setting to null`,
        );
        validBranchId = null;
      }
    }

    const expenseId = uuidv4();
    const now = new Date();
    const categoryId = await this.resolveCategoryId(tenantId, dto);

    const expenseType = this.getTrimmedString(dto.expenseType) || 'one_time';
    const frequency =
      expenseType === 'recurring'
        ? (this.getTrimmedString(dto.frequency) ?? null)
        : null;
    const nextDueDate =
      expenseType === 'recurring'
        ? (this.parseDate(dto.nextDueDate) ?? null)
        : null;

    // Create expense record
    const expense = await this.prisma.expense.create({
      data: {
        id: expenseId,
        tenantId,
        userId,
        amount,
        description,
        categoryId,
        expenseType,
        frequency,
        nextDueDate,
        branchId: validBranchId,
        receiptUrl: this.getTrimmedString(dto.receiptUrl),
        notes: this.getTrimmedString(dto.notes),
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
          amount,
          description,
          category: this.getTrimmedString(dto.category),
        },
        undefined,
      );
    }

    try {
      await this.ledgerService.recordExpenseAutomation(tenantId, userId, {
        expenseId: expense.id,
        amount: expense.amount,
        description: expense.description,
        categoryName:
          expense.category?.name || this.getTrimmedString(dto.category),
        paymentMethod: this.getTrimmedString(dto.paymentMethod),
        date: expense.createdAt,
      });
    } catch (error) {
      console.error('Failed to record automated expense entry:', error);
    }

    return expense;
  }

  async getExpenses(
    tenantId: string,
    branchId?: string,
    query?: ExpenseListQuery,
  ) {
    const whereClause: Prisma.ExpenseWhereInput = { tenantId };

    // Filter by branch if specified
    if (branchId && branchId !== 'all') {
      whereClause.branchId = branchId;
    }

    // Filter by category if specified
    const category = this.getTrimmedString(query?.category);
    if (category) {
      whereClause.categoryId = category;
    }

    // Filter by expense type if specified
    const expenseType = this.getTrimmedString(query?.expenseType);
    if (expenseType) {
      whereClause.expenseType = expenseType;
    }

    // Search by description
    const search = this.getTrimmedString(query?.search);
    if (search) {
      whereClause.description = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Filter by date range if specified, otherwise default to current month
    const startDate = this.parseDate(query?.startDate);
    const endDate = this.parseDate(query?.endDate);
    if (startDate || endDate) {
      whereClause.createdAt = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      };
    } else {
      // Default to current month if no date filters provided
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      whereClause.createdAt = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    // Sorting
    let orderBy: Prisma.ExpenseOrderByWithRelationInput = { createdAt: 'desc' };
    const sortField = this.parseSortField(this.getTrimmedString(query?.sortBy));
    if (sortField) {
      const sortOrder = query?.sortOrder === 'asc' ? 'asc' : 'desc';
      orderBy = {
        [sortField]: sortOrder,
      } as Prisma.ExpenseOrderByWithRelationInput;
    }

    // Pagination
    const page = Number.parseInt(query?.page || '', 10) || 1;
    const limit = Number.parseInt(query?.limit || '', 10) || 10;
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

  async getExpenseById(id: string, tenantId: string, branchId?: string) {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id,
        tenantId,
        ...(branchId ? { branchId } : {}),
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

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async updateExpense(
    id: string,
    dto: ExpenseMutationInput,
    tenantId: string,
    branchId?: string,
  ) {
    // Check if expense exists and belongs to tenant
    const existingExpense = await this.prisma.expense.findFirst({
      where: {
        id,
        tenantId,
        ...(branchId ? { branchId } : {}),
      },
    });

    if (!existingExpense) {
      throw new NotFoundException('Expense not found');
    }

    // Validate branch if provided
    const dtoBranchId = this.getTrimmedString(dto.branchId);
    let validBranchId: string | null = dtoBranchId || existingExpense.branchId;
    if (dtoBranchId) {
      const branchExists = await this.prisma.branch.findUnique({
        where: { id: dtoBranchId },
        select: { id: true, tenantId: true },
      });
      if (!branchExists || branchExists.tenantId !== tenantId) {
        console.warn(
          `Invalid branchId ${dtoBranchId} for tenant ${tenantId}, keeping existing`,
        );
        validBranchId = existingExpense.branchId;
      }
    }

    const resolvedCategoryId = await this.resolveCategoryId(tenantId, dto);
    const nextCategoryId =
      dto.categoryId !== undefined || dto.category !== undefined
        ? resolvedCategoryId
        : existingExpense.categoryId;

    const nextExpenseType = this.getTrimmedString(dto.expenseType);
    const expenseType = nextExpenseType || existingExpense.expenseType;
    const frequency =
      expenseType === 'recurring'
        ? (this.getTrimmedString(dto.frequency) ?? existingExpense.frequency)
        : null;
    const nextDueDate =
      expenseType === 'recurring'
        ? (this.parseDate(dto.nextDueDate) ?? existingExpense.nextDueDate)
        : null;

    const updatedExpense = await this.prisma.expense.update({
      where: { id },
      data: {
        amount: this.getPositiveNumber(dto.amount) ?? existingExpense.amount,
        description:
          this.getTrimmedString(dto.description) ?? existingExpense.description,
        categoryId: nextCategoryId,
        expenseType,
        frequency,
        nextDueDate,
        branchId: validBranchId,
        receiptUrl:
          this.getTrimmedString(dto.receiptUrl) ?? existingExpense.receiptUrl,
        notes: this.getTrimmedString(dto.notes) ?? existingExpense.notes,
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

  async deleteExpense(id: string, tenantId: string, branchId?: string) {
    // Check if expense exists and belongs to tenant
    const existingExpense = await this.prisma.expense.findFirst({
      where: {
        id,
        tenantId,
        ...(branchId ? { branchId } : {}),
      },
    });

    if (!existingExpense) {
      throw new NotFoundException('Expense not found');
    }

    const now = new Date();
    await this.prisma.expense.update({
      where: {
        id,
        tenantId,
        ...(branchId ? { branchId } : {}),
        deletedAt: null,
      },
      data: { deletedAt: now, isActive: false },
    });

    try {
      await this.ledgerService.reverseExpenseAutomation(
        tenantId,
        existingExpense.userId,
        {
          expenseId: existingExpense.id,
          reason: 'Expense deleted',
          date: now,
        },
      );
    } catch (error) {
      console.error(
        'Failed to create reversal journal for deleted expense:',
        error,
      );
    }

    return { success: true, message: 'Expense deleted successfully' };
  }

  async getExpenseAnalytics(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
    branchId?: string,
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
        ...(branchId ? { branchId } : {}),
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

  async getBranchComparison(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
    branchId?: string,
  ) {
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
        ...(branchId ? { branchId } : {}),
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
    const branchData: Record<
      string,
      {
        branchName: string;
        totalAmount: number;
        expenseCount: number;
        categories: Record<string, number>;
        expenses: ExpensePreview[];
      }
    > = {};

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

  async resetMonthlyExpenses(
    tenantId: string,
    userId: string,
    branchId?: string,
  ) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    // Get all expenses for current month
    const monthlyExpenses = await this.prisma.expense.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        isActive: true,
        ...(branchId ? { branchId } : {}),
      },
    });

    if (monthlyExpenses.length === 0) {
      throw new BadRequestException(
        'No expenses found for current month to reset',
      );
    }

    // Calculate monthly summary
    const totalAmount = monthlyExpenses.reduce(
      (sum, exp) => sum + exp.amount,
      0,
    );
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
      expenseIds: monthlyExpenses.map((exp) => exp.id),
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
        ...(branchId ? { branchId } : {}),
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

  async getPastMonthsRecords(
    tenantId: string,
    months: number = 12,
    branchId?: string,
  ) {
    const now = new Date();
    const records: Array<{
      month: string;
      monthName: string;
      totalAmount: number;
      expenseCount: number;
      categories: Record<string, number>;
      branches: Record<string, number>;
      expenses: ExpensePreview[];
    }> = [];

    for (let i = 0; i < months; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        1,
      );
      const endOfMonth = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      const expenses = await this.prisma.expense.findMany({
        where: {
          tenantId,
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          isActive: true,
          ...(branchId ? { branchId } : {}),
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
      expenses.forEach((exp) => {
        const category = exp.category?.name || 'Uncategorized';
        categories[category] = (categories[category] || 0) + exp.amount;
      });

      // Group by branch
      const branches: Record<string, number> = {};
      expenses.forEach((exp) => {
        const branch = exp.branch?.name || 'Unassigned Branch';
        branches[branch] = (branches[branch] || 0) + exp.amount;
      });

      records.push({
        month: startOfMonth.toISOString().slice(0, 7), // YYYY-MM
        monthName: startOfMonth.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
        }),
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

  async getExpenseTotalForMonth(
    tenantId: string,
    month: number,
    year: number,
    branchId?: string,
  ) {
    console.log(
      `getExpenseTotalForMonth called with tenantId: ${tenantId}, month: ${month}, year: ${year}`,
    );
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Get all active expenses for the month
    const expenses = await this.prisma.expense.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        isActive: true,
        ...(branchId ? { branchId } : {}),
      },
    });
    console.log(`Found ${expenses.length} expenses for ${month}/${year}`);

    // Calculate total expense amount
    const totalAmount = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );

    const monthName = startOfMonth.toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });
    console.log(`Final total for ${monthName}: ${totalAmount}`);

    return {
      monthName,
      totalAmount,
      expenseCount: expenses.length,
    };
  }

  async fetchExpenseTotalForMonth(
    tenantId: string,
    month: number,
    year: number,
    branchId?: string,
  ) {
    console.log(
      `fetchExpenseTotalForMonth called with tenantId: ${tenantId}, month: ${month}, year: ${year}`,
    );
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Get all active expenses for the month
    const expenses = await this.prisma.expense.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        isActive: true,
        ...(branchId ? { branchId } : {}),
      },
    });
    console.log(`Found ${expenses.length} expenses for ${month}/${year}`);

    // Calculate total expense amount
    const totalAmount = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );

    const monthName = startOfMonth.toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });
    console.log(`Final total for ${monthName}: ${totalAmount}`);

    return {
      monthName,
      totalAmount,
      expenseCount: expenses.length,
    };
  }

  async getCurrentMonthExpenseTotal(tenantId: string, branchId?: string) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    return this.getExpenseTotalForMonth(tenantId, month, year, branchId);
  }

  async getExpensesByMonth(
    tenantId: string,
    month: number,
    year: number,
    branchId?: string,
    query?: ExpenseListQuery,
  ) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const whereClause: Prisma.ExpenseWhereInput = {
      tenantId,
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
      isActive: true,
    };

    // Filter by branch if specified
    if (branchId && branchId !== 'all') {
      whereClause.branchId = branchId;
    }

    // Filter by category if specified
    const category = this.getTrimmedString(query?.category);
    if (category) {
      whereClause.categoryId = category;
    }

    // Filter by expense type if specified
    const expenseType = this.getTrimmedString(query?.expenseType);
    if (expenseType) {
      whereClause.expenseType = expenseType;
    }

    // Search by description
    const search = this.getTrimmedString(query?.search);
    if (search) {
      whereClause.description = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Sorting
    let orderBy: Prisma.ExpenseOrderByWithRelationInput = { createdAt: 'desc' };
    const sortField = this.parseSortField(this.getTrimmedString(query?.sortBy));
    if (sortField) {
      const sortOrder = query?.sortOrder === 'asc' ? 'asc' : 'desc';
      orderBy = {
        [sortField]: sortOrder,
      } as Prisma.ExpenseOrderByWithRelationInput;
    }

    // Pagination
    const page = Number.parseInt(query?.page || '', 10) || 1;
    const limit = Number.parseInt(query?.limit || '', 10) || 10;
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
          category: {
            select: {
              id: true,
              name: true,
              color: true,
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
}
