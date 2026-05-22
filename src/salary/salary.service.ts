import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';
import { ExpensesService } from '../expenses/expenses.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SalaryService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private expensesService: ExpensesService,
  ) {}

  private async getOrCreateSalaryCategory(tenantId: string): Promise<string> {
    let salaryCategory = await this.prisma.expenseCategory.findFirst({
      where: {
        tenantId,
        name: {
          equals: 'Salary',
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });

    if (!salaryCategory) {
      salaryCategory = await this.prisma.expenseCategory.create({
        data: {
          tenantId,
          name: 'Salary',
          description: 'Employee salary expenses',
          color: '#FF6B6B',
          isActive: true,
        },
        select: { id: true },
      });
    }

    return salaryCategory.id;
  }

  async createSalaryScheme(dto: any, tenantId: string, userId: string) {
    // Validate required fields
    if (!dto.employeeName?.trim()) {
      throw new BadRequestException('Employee name is required');
    }
    if (!dto.salaryAmount || dto.salaryAmount <= 0) {
      throw new BadRequestException('Valid salary amount is required');
    }
    if (!dto.frequency || !['monthly', 'yearly'].includes(dto.frequency)) {
      throw new BadRequestException('Valid frequency (monthly or yearly) is required');
    }
    if (!dto.startDate) {
      throw new BadRequestException('Start date is required');
    }

    // Validate userId if provided
    let validUserId: string | null = dto.userId || null;
    if (dto.userId) {
      const userExists = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { id: true, tenantId: true },
      });
      if (!userExists || userExists.tenantId !== tenantId) {
        throw new BadRequestException('Invalid user selected');
      }
      validUserId = dto.userId;
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

    const salarySchemeId = uuidv4();
    const now = new Date();
    const startDate = new Date(dto.startDate);

    // Calculate nextDueDate based on startDate and frequency
    let nextDueDate = new Date(startDate);
    if (dto.frequency === 'monthly') {
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    } else if (dto.frequency === 'yearly') {
      nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
    }

    // Create salary scheme record
    const salaryScheme = await this.prisma.salaryScheme.create({
      data: {
        id: salarySchemeId,
        tenantId,
        userId: validUserId || userId,
        employeeName: dto.employeeName.trim(),
        salaryAmount: dto.salaryAmount,
        frequency: dto.frequency,
        startDate: startDate,
        nextDueDate: nextDueDate,
        branchId: validBranchId,
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
        'salary_scheme_created',
        {
          salarySchemeId,
          employeeName: dto.employeeName,
          salaryAmount: dto.salaryAmount,
          frequency: dto.frequency,
        },
        undefined,
      );
    }

    // Post the first salary expense for schemes that start today or in the past.
    if (startDate <= now) {
      try {
        const salaryCategoryId = await this.getOrCreateSalaryCategory(tenantId);
        await this.expensesService.createExpense(
          {
            amount: dto.salaryAmount,
            description: `Salary for ${dto.employeeName.trim()}`,
            categoryId: salaryCategoryId,
            expenseType: 'one_time',
            branchId: validBranchId,
            notes: `Auto-generated initial salary expense for scheme ${salaryScheme.id}`,
          },
          tenantId,
          validUserId || userId,
        );

        await this.prisma.salaryScheme.update({
          where: { id: salaryScheme.id },
          data: {
            lastPaidDate: startDate,
            updatedAt: new Date(),
          },
        });
      } catch (error) {
        console.error('Failed to create initial salary expense entry:', error);
      }
    }

    return salaryScheme;
  }

  async syncSalarySchemeExpenses(
    tenantId: string,
    actorUserId: string,
    branchId?: string,
  ) {
    const now = new Date();
    const salaryCategoryId = await this.getOrCreateSalaryCategory(tenantId);

    const schemes = await this.prisma.salaryScheme.findMany({
      where: {
        tenantId,
        isActive: true,
        startDate: { lte: now },
        ...(branchId ? { branchId } : {}),
      },
      select: {
        id: true,
        employeeName: true,
        salaryAmount: true,
        userId: true,
        branchId: true,
        startDate: true,
        lastPaidDate: true,
      },
    });

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const scheme of schemes) {
      const marker = `Auto-generated initial salary expense for scheme ${scheme.id}`;

      const existingExpense = await this.prisma.expense.findFirst({
        where: {
          tenantId,
          deletedAt: null,
          notes: { contains: marker },
        },
        select: { id: true },
      });

      if (existingExpense) {
        skipped += 1;
        continue;
      }

      try {
        await this.expensesService.createExpense(
          {
            amount: scheme.salaryAmount,
            description: `Salary for ${scheme.employeeName}`,
            categoryId: salaryCategoryId,
            expenseType: 'one_time',
            branchId: scheme.branchId,
            notes: marker,
          },
          tenantId,
          scheme.userId || actorUserId,
        );

        await this.prisma.salaryScheme.update({
          where: { id: scheme.id },
          data: {
            lastPaidDate: scheme.lastPaidDate || scheme.startDate,
            updatedAt: new Date(),
          },
        });

        created += 1;
      } catch (error) {
        failed += 1;
        console.error(`Failed to sync salary scheme expense for ${scheme.id}:`, error);
      }
    }

    return {
      scanned: schemes.length,
      created,
      skipped,
      failed,
    };
  }

  async getSalarySchemes(tenantId: string, branchId?: string, query?: any) {
    const whereClause: any = { tenantId, isActive: true };

    // Filter by branch if specified
    if (branchId && branchId !== 'all') {
      whereClause.branchId = branchId;
    }

    // Search by employee name
    if (query?.search) {
      whereClause.employeeName = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    // Filter by frequency if specified
    if (query?.frequency) {
      whereClause.frequency = query.frequency;
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

    const [salarySchemes, total] = await Promise.all([
      this.prisma.salaryScheme.findMany({
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
      this.prisma.salaryScheme.count({ where: whereClause }),
    ]);

    return {
      salarySchemes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSalarySchemeById(id: string, tenantId: string, branchId?: string) {
    const salaryScheme = await this.prisma.salaryScheme.findFirst({
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

    if (!salaryScheme) {
      throw new NotFoundException('Salary scheme not found');
    }

    return salaryScheme;
  }

  async updateSalaryScheme(id: string, dto: any, tenantId: string, branchId?: string) {
    // Check if salary scheme exists and belongs to tenant
    const existingSalaryScheme = await this.prisma.salaryScheme.findFirst({
      where: {
        id,
        tenantId,
        ...(branchId ? { branchId } : {}),
      },
    });

    if (!existingSalaryScheme) {
      throw new NotFoundException('Salary scheme not found');
    }

    // Validate branch if provided
    let validBranchId: string | null = dto.branchId || existingSalaryScheme.branchId;
    if (dto.branchId) {
      const branchExists = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
        select: { id: true, tenantId: true },
      });
      if (!branchExists || branchExists.tenantId !== tenantId) {
        console.warn(
          `Invalid branchId ${dto.branchId} for tenant ${tenantId}, keeping existing`,
        );
        validBranchId = existingSalaryScheme.branchId;
      }
    }

    const updatedSalaryScheme = await this.prisma.salaryScheme.update({
      where: { id },
      data: {
        employeeName: dto.employeeName?.trim(),
        salaryAmount: dto.salaryAmount,
        frequency: dto.frequency,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        branchId: validBranchId,
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

    return updatedSalaryScheme;
  }

  async deleteSalaryScheme(id: string, tenantId: string, branchId?: string) {
    // Check if salary scheme exists and belongs to tenant
    const existingSalaryScheme = await this.prisma.salaryScheme.findFirst({
      where: {
        id,
        tenantId,
        ...(branchId ? { branchId } : {}),
      },
    });

    if (!existingSalaryScheme) {
      throw new NotFoundException('Salary scheme not found');
    }

    // Soft delete by setting isActive to false
    await this.prisma.salaryScheme.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return { success: true, message: 'Salary scheme deleted successfully' };
  }

  async getSalaryAnalytics(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
    branchId?: string,
  ) {
    // Set default date range if not provided (last 30 days)
    const end = endDate || new Date();
    const start = startDate || new Date();
    start.setDate(start.getDate() - 30);

    // Get all salary schemes in the date range
    const salarySchemes = await this.prisma.salaryScheme.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
        createdAt: {
          gte: start,
          lte: end,
        },
        isActive: true,
      },
    });

    // Calculate analytics
    const totalSalarySchemes = salarySchemes.length;
    const totalSalaryAmount = salarySchemes.reduce(
      (sum, scheme) => sum + scheme.salaryAmount,
      0,
    );
    const avgSalaryAmount =
      totalSalarySchemes > 0 ? totalSalaryAmount / totalSalarySchemes : 0;

    // Salary schemes by frequency
    const salarySchemesByFrequency: Record<string, { count: number; amount: number }> = {};
    salarySchemes.forEach((scheme) => {
      const frequency = scheme.frequency;
      if (!salarySchemesByFrequency[frequency]) {
        salarySchemesByFrequency[frequency] = { count: 0, amount: 0 };
      }
      salarySchemesByFrequency[frequency].count++;
      salarySchemesByFrequency[frequency].amount += scheme.salaryAmount;
    });

    return {
      totalSalarySchemes,
      totalSalaryAmount,
      avgSalaryAmount,
      salarySchemesByFrequency,
    };
  }

  async getCurrentMonthSalaryTotal(tenantId: string, branchId?: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get all active salary schemes
    const salarySchemes = await this.prisma.salaryScheme.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
        isActive: true,
      },
    });

    // Calculate total monthly salary expense
    let totalMonthlyAmount = 0;
    salarySchemes.forEach((scheme) => {
      if (scheme.frequency === 'monthly') {
        // For monthly schemes, add the full amount if started before or during this month
        const startDate = new Date(scheme.startDate);
        if (startDate <= endOfMonth) {
          totalMonthlyAmount += scheme.salaryAmount;
        }
      } else if (scheme.frequency === 'yearly') {
        // For yearly schemes, prorate if the start date is in this month
        const startDate = new Date(scheme.startDate);
        if (startDate.getMonth() === now.getMonth() && startDate.getFullYear() === now.getFullYear()) {
          // If started this month, add the full yearly amount (assuming it's due this month)
          totalMonthlyAmount += scheme.salaryAmount;
        } else if (startDate <= endOfMonth) {
          // For ongoing yearly schemes, add 1/12 of the amount
          totalMonthlyAmount += scheme.salaryAmount / 12;
        }
      }
    });

    const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    return {
      monthName,
      totalAmount: totalMonthlyAmount,
      salarySchemeCount: salarySchemes.length,
    };
  }

  async getSalaryTotalForMonth(tenantId: string, month: number, year: number, branchId?: string) {
    console.log(`getSalaryTotalForMonth called with tenantId: ${tenantId}, month: ${month}, year: ${year}`);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Get all active salary schemes
    const salarySchemes = await this.prisma.salaryScheme.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
        isActive: true,
      },
    });
    console.log(`Found ${salarySchemes.length} active salary schemes for tenant ${tenantId}`);

    // Calculate total monthly salary expense
    let totalMonthlyAmount = 0;
    salarySchemes.forEach((scheme) => {
      console.log(`Processing scheme: ${scheme.employeeName}, frequency: ${scheme.frequency}, amount: ${scheme.salaryAmount}, startDate: ${scheme.startDate}`);
      if (scheme.frequency === 'monthly') {
        // For monthly schemes, add the full amount if started before or during this month
        const startDate = new Date(scheme.startDate);
        if (startDate <= endOfMonth) {
          totalMonthlyAmount += scheme.salaryAmount;
          console.log(`Added monthly amount: ${scheme.salaryAmount}, total now: ${totalMonthlyAmount}`);
        }
      } else if (scheme.frequency === 'yearly') {
        // For yearly schemes, prorate if the start date is in this month
        const startDate = new Date(scheme.startDate);
        if (startDate.getMonth() === month - 1 && startDate.getFullYear() === year) {
          // If started this month, add the full yearly amount (assuming it's due this month)
          totalMonthlyAmount += scheme.salaryAmount;
          console.log(`Added full yearly amount for new scheme: ${scheme.salaryAmount}, total now: ${totalMonthlyAmount}`);
        } else if (startDate <= endOfMonth) {
          // For ongoing yearly schemes, add 1/12 of the amount
          const proratedAmount = scheme.salaryAmount / 12;
          totalMonthlyAmount += proratedAmount;
          console.log(`Added prorated yearly amount: ${proratedAmount}, total now: ${totalMonthlyAmount}`);
        }
      }
    });

    const monthName = startOfMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    console.log(`Final total for ${monthName}: ${totalMonthlyAmount}`);

    return {
      monthName,
      totalAmount: totalMonthlyAmount,
      salarySchemeCount: salarySchemes.length,
    };
  }

  async getSalarySchemesByMonth(tenantId: string, month: number, year: number, branchId?: string, query?: any) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const whereClause: any = {
      tenantId,
      isActive: true,
    };

    // Filter by branch if specified
    if (branchId && branchId !== 'all') {
      whereClause.branchId = branchId;
    }

    // Search by employee name
    if (query?.search) {
      whereClause.employeeName = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    // Filter by frequency if specified
    if (query?.frequency) {
      whereClause.frequency = query.frequency;
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

    const [salarySchemes, total] = await Promise.all([
      this.prisma.salaryScheme.findMany({
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
      this.prisma.salaryScheme.count({ where: whereClause }),
    ]);

    // Convert salary schemes to expense-like objects for the month
    const salaryExpenses: any[] = salarySchemes.map((scheme) => ({
      id: 'salary-' + scheme.id,
      amount: scheme.frequency === 'monthly' ? scheme.salaryAmount :
              (scheme.frequency === 'yearly' ? scheme.salaryAmount / 12 : 0),
      description: `Salary for ${scheme.employeeName} (${scheme.frequency})`,
      categoryId: 'salary',
      category: { id: 'salary', name: 'salary' },
      expenseType: 'recurring' as const,
      frequency: scheme.frequency,
      nextDueDate: scheme.nextDueDate,
      branchId: scheme.branchId,
      notes: scheme.notes,
      isActive: scheme.isActive,
      createdAt: scheme.startDate,
      updatedAt: scheme.updatedAt,
      user: scheme.user,
      branch: scheme.branch,
    }));

    return {
      salarySchemes: salaryExpenses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
