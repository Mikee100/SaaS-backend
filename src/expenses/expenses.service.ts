import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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
        console.warn(`Invalid branchId ${dto.branchId} for tenant ${tenantId}, setting to null`);
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
        category: dto.category || 'other',
        expenseType: dto.expenseType || 'one_time',
        frequency: dto.expenseType === 'recurring' ? dto.frequency : null,
        nextDueDate: dto.expenseType === 'recurring' ? (dto.nextDueDate ? new Date(dto.nextDueDate) : null) : null,
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
      whereClause.category = query.category;
    }

    // Filter by expense type if specified
    if (query?.expenseType) {
      whereClause.expenseType = query.expenseType;
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

    const expenses = await this.prisma.expense.findMany({
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
      orderBy: { createdAt: 'desc' },
    });

    return expenses;
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
        console.warn(`Invalid branchId ${dto.branchId} for tenant ${tenantId}, keeping existing`);
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
        nextDueDate: dto.expenseType === 'recurring' ? (dto.nextDueDate ? new Date(dto.nextDueDate) : null) : null,
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

  async getExpenseAnalytics(tenantId: string, startDate?: Date, endDate?: Date) {
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
    });

    // Calculate analytics
    const totalExpenses = expenses.length;
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const avgExpenseAmount = totalExpenses > 0 ? totalAmount / totalExpenses : 0;

    // Expenses by category
    const expensesByCategory: Record<string, { count: number; amount: number }> = {};
    expenses.forEach(expense => {
      const category = expense.category;
      if (!expensesByCategory[category]) {
        expensesByCategory[category] = { count: 0, amount: 0 };
      }
      expensesByCategory[category].count++;
      expensesByCategory[category].amount += expense.amount;
    });

    // Expenses by type
    const expensesByType: Record<string, { count: number; amount: number }> = {};
    expenses.forEach(expense => {
      const type = expense.expenseType;
      if (!expensesByType[type]) {
        expensesByType[type] = { count: 0, amount: 0 };
      }
      expensesByType[type].count++;
      expensesByType[type].amount += expense.amount;
    });

    // Expenses by month
    const expensesByMonth: Record<string, number> = {};
    expenses.forEach(expense => {
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
}
