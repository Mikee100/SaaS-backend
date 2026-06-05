import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';
import { ExpensesService } from '../expenses/expenses.service';
import { v4 as uuidv4 } from 'uuid';
import { HrService } from '../hr/hr.service';

interface StatutoryBreakdown {
  paye?: number;
  nssfEmployee?: number;
  nssfEmployer?: number;
  healthInsuranceEmployee?: number;
  housingLevyEmployee?: number;
  housingLevyEmployer?: number;
  totalEmployeeStatutory?: number;
  totalEmployerStatutory?: number;
}

interface PayrollItemLike {
  statutory?: StatutoryBreakdown;
}

interface TemplateAdjustmentLike {
  bonus?: number;
  commission?: number;
  deduction?: number;
  breakdown?: unknown[];
}

interface PayrollRunItem extends PayrollItemLike {
  salarySchemeId?: string;
  employeeName?: string;
  userId?: string;
  branchId?: string | null;
  baseSalary?: number;
  templateBonus?: number;
  templateCommission?: number;
  templateDeduction?: number;
  manualBonus?: number;
  manualCommission?: number;
  manualDeduction?: number;
  bonus?: number;
  commission?: number;
  deduction?: number;
  netPay?: number;
  note?: string;
}

interface SalarySchemePayload {
  employeeName?: string;
  salaryAmount?: number;
  frequency?: 'monthly' | 'yearly';
  startDate?: string | Date;
  userId?: string;
  branchId?: string;
  notes?: string;
}

@Injectable()
export class SalaryService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private expensesService: ExpensesService,
    private hrService: HrService,
  ) {}

  private toStringOrUndefined(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value : undefined;
  }

  private toNumberOrUndefined(value: unknown): number | undefined {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

  private isSortDirection(value: unknown): value is Prisma.SortOrder {
    return value === 'asc' || value === 'desc';
  }

  private toSalaryQuery(query?: Record<string, unknown>): {
    search?: string;
    frequency?: string;
    sortBy?: string;
    sortOrder?: Prisma.SortOrder;
    page: number;
    limit: number;
  } {
    const page = this.toNumberOrUndefined(query?.page) ?? 1;
    const limit = this.toNumberOrUndefined(query?.limit) ?? 10;
    return {
      search: this.toStringOrUndefined(query?.search),
      frequency: this.toStringOrUndefined(query?.frequency),
      sortBy: this.toStringOrUndefined(query?.sortBy),
      sortOrder: this.isSortDirection(query?.sortOrder)
        ? query.sortOrder
        : undefined,
      page: page > 0 ? page : 1,
      limit: limit > 0 ? limit : 10,
    };
  }

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

  private getSalaryAmountForMonth(
    scheme: { frequency: string; salaryAmount: number; startDate: Date },
    month: number,
    year: number,
  ): number {
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    const startDate = new Date(scheme.startDate);

    if (scheme.frequency === 'monthly') {
      return startDate <= endOfMonth ? scheme.salaryAmount : 0;
    }

    if (scheme.frequency === 'yearly') {
      if (startDate > endOfMonth) {
        return 0;
      }

      if (
        startDate.getMonth() === month - 1 &&
        startDate.getFullYear() === year
      ) {
        return scheme.salaryAmount;
      }

      return scheme.salaryAmount / 12;
    }

    return 0;
  }

  private normalizeAmount(value: unknown): number {
    const parsed = typeof value === 'number' ? value : Number(value ?? 0);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }

    return parsed;
  }

  private computeLiabilityTotals(items: PayrollItemLike[]) {
    return {
      paye: items.reduce((sum, item) => sum + (item.statutory?.paye || 0), 0),
      nssfEmployee: items.reduce(
        (sum, item) => sum + (item.statutory?.nssfEmployee || 0),
        0,
      ),
      nssfEmployer: items.reduce(
        (sum, item) => sum + (item.statutory?.nssfEmployer || 0),
        0,
      ),
      healthInsuranceEmployee: items.reduce(
        (sum, item) => sum + (item.statutory?.healthInsuranceEmployee || 0),
        0,
      ),
      housingLevyEmployee: items.reduce(
        (sum, item) => sum + (item.statutory?.housingLevyEmployee || 0),
        0,
      ),
      housingLevyEmployer: items.reduce(
        (sum, item) => sum + (item.statutory?.housingLevyEmployer || 0),
        0,
      ),
      totalEmployeeStatutory: items.reduce(
        (sum, item) => sum + (item.statutory?.totalEmployeeStatutory || 0),
        0,
      ),
      totalEmployerStatutory: items.reduce(
        (sum, item) => sum + (item.statutory?.totalEmployerStatutory || 0),
        0,
      ),
    };
  }

  private toPayrollRunItems(rawItems: unknown): PayrollRunItem[] {
    if (!Array.isArray(rawItems)) {
      return [];
    }
    return rawItems.filter(
      (item): item is PayrollRunItem =>
        typeof item === 'object' && item !== null,
    );
  }

  private normalizeTemplateAdjustments(
    rawValue: unknown,
  ): Map<string, TemplateAdjustmentLike> {
    if (!(rawValue instanceof Map)) {
      return new Map<string, TemplateAdjustmentLike>();
    }

    const normalized = new Map<string, TemplateAdjustmentLike>();
    rawValue.forEach((value, key) => {
      if (typeof key !== 'string' || typeof value !== 'object' || !value) {
        return;
      }
      normalized.set(key, value as TemplateAdjustmentLike);
    });
    return normalized;
  }

  async buildPayrollPreview(
    tenantId: string,
    month: number,
    year: number,
    branchId?: string,
    applyTemplates = true,
    adjustments: Array<{
      salarySchemeId: string;
      bonus?: number;
      commission?: number;
      deduction?: number;
      paidAmount?: number;
      note?: string;
    }> = [],
  ) {
    if (
      !month ||
      !year ||
      month < 1 ||
      month > 12 ||
      year < 1900 ||
      year > 2100
    ) {
      throw new BadRequestException(
        'Valid month (1-12) and year (1900-2100) are required',
      );
    }

    const schemes = await this.prisma.salaryScheme.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
        isActive: true,
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
      orderBy: {
        employeeName: 'asc',
      },
    });

    const adjustmentMap = new Map(
      adjustments
        .filter((item) => !!item?.salarySchemeId)
        .map((item) => [item.salarySchemeId, item]),
    );

    const templateAdjustments = applyTemplates
      ? this.normalizeTemplateAdjustments(
          await this.hrService.buildTemplateAdjustments(
            tenantId,
            schemes.map((scheme) => ({
              salarySchemeId: scheme.id,
              employeeName: scheme.employeeName,
              baseSalary: this.getSalaryAmountForMonth(scheme, month, year),
              branchId: scheme.branchId,
            })),
          ),
        )
      : new Map<string, TemplateAdjustmentLike>();

    const payrollSettings = await this.hrService.getPayrollSettings(tenantId);

    const payrollItems = schemes
      .map((scheme) => {
        const adjustment = adjustmentMap.get(scheme.id);
        const templateAdjustment = templateAdjustments.get(scheme.id);
        const baseSalary = this.getSalaryAmountForMonth(scheme, month, year);
        const manualBonus = this.normalizeAmount(adjustment?.bonus);
        const manualCommission = this.normalizeAmount(adjustment?.commission);
        const manualDeduction = this.normalizeAmount(adjustment?.deduction);
        const templateBonus = this.normalizeAmount(templateAdjustment?.bonus);
        const templateCommission = this.normalizeAmount(
          templateAdjustment?.commission,
        );
        const templateDeduction = this.normalizeAmount(
          templateAdjustment?.deduction,
        );
        const bonus = templateBonus + manualBonus;
        const commission = templateCommission + manualCommission;
        const deduction = templateDeduction + manualDeduction;
        const grossPay = baseSalary + bonus + commission;
        const statutory = this.hrService.calculateKenyaStatutoryDeductions(
          grossPay,
          payrollSettings,
        );
        const nonTaxDeduction = deduction;
        const netPay = Math.max(
          0,
          grossPay - nonTaxDeduction - statutory.totalEmployeeStatutory,
        );

        const paidAmountRaw = adjustment?.paidAmount;
        const hasPaidAmount =
          paidAmountRaw !== undefined &&
          paidAmountRaw !== null &&
          String(paidAmountRaw).trim() !== '';
        const paidAmount = hasPaidAmount
          ? this.normalizeAmount(paidAmountRaw)
          : netPay;
        const variance = Number((paidAmount - netPay).toFixed(2));

        return {
          salarySchemeId: scheme.id,
          employeeName: scheme.employeeName,
          userId: scheme.userId,
          branchId: scheme.branchId,
          baseSalary,
          bonus,
          commission,
          deduction,
          nonTaxDeduction,
          statutory,
          templateBonus,
          templateCommission,
          templateDeduction,
          manualBonus,
          manualCommission,
          manualDeduction,
          grossPay,
          netPay,
          paidAmount,
          variance,
          templateBreakdown: templateAdjustment?.breakdown || [],
          note: adjustment?.note || null,
          frequency: scheme.frequency,
          startDate: scheme.startDate,
          user: scheme.user,
          branch: scheme.branch,
        };
      })
      .filter(
        (item) => item.baseSalary > 0 || item.bonus > 0 || item.deduction > 0,
      );

    const totals = payrollItems.reduce(
      (acc, item) => {
        acc.baseSalary += item.baseSalary;
        acc.bonus += item.bonus;
        acc.commission += item.commission;
        acc.deduction += item.deduction;
        acc.nonTaxDeduction += item.nonTaxDeduction;
        acc.statutoryDeductions += item.statutory.totalEmployeeStatutory;
        acc.employerStatutoryContributions +=
          item.statutory.totalEmployerStatutory;
        acc.grossPay += item.grossPay;
        acc.netPay += item.netPay;
        acc.paidAmount += item.paidAmount;
        acc.variance += item.variance;
        return acc;
      },
      {
        baseSalary: 0,
        bonus: 0,
        commission: 0,
        deduction: 0,
        nonTaxDeduction: 0,
        statutoryDeductions: 0,
        employerStatutoryContributions: 0,
        grossPay: 0,
        netPay: 0,
        paidAmount: 0,
        variance: 0,
      },
    );

    const monthName = new Date(year, month - 1, 1).toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });

    return {
      month,
      year,
      monthName,
      applyTemplates,
      payrollSettings,
      payrollItems,
      reconciliation: {
        status:
          Math.abs(totals.variance) < 0.01 ? 'balanced' : 'variance_detected',
        totals,
      },
    };
  }

  async processPayroll(
    tenantId: string,
    actorUserId: string,
    payload: {
      month: number;
      year: number;
      branchId?: string;
      applyTemplates?: boolean;
      adjustments?: Array<{
        salarySchemeId: string;
        bonus?: number;
        commission?: number;
        deduction?: number;
        paidAmount?: number;
        note?: string;
      }>;
    },
  ) {
    const locked = await this.hrService.isPayrollPeriodLocked(
      tenantId,
      payload.month,
      payload.year,
      payload.branchId,
    );
    if (locked) {
      throw new BadRequestException(
        'Payroll period is locked. Unlock period before processing',
      );
    }

    const existingActiveRun = await this.hrService.findActiveRunForPeriod(
      tenantId,
      payload.month,
      payload.year,
      payload.branchId,
    );
    if (existingActiveRun) {
      throw new BadRequestException(
        'Payroll run already exists for this period',
      );
    }

    const preview = await this.buildPayrollPreview(
      tenantId,
      payload.month,
      payload.year,
      payload.branchId,
      payload.applyTemplates !== false,
      payload.adjustments || [],
    );

    const payableItems = preview.payrollItems.filter((item) => item.netPay > 0);

    if (payableItems.length === 0) {
      return {
        ...preview,
        processedCount: 0,
        status: 'draft',
        message: 'No payable payroll items found for selected period',
      };
    }

    await this.auditLogService.log(
      actorUserId,
      'payroll_draft_created',
      {
        month: payload.month,
        year: payload.year,
        processedCount: payableItems.length,
        totals: preview.reconciliation.totals,
      },
      undefined,
    );

    await this.hrService.recordPayrollRun(tenantId, {
      id: uuidv4(),
      month: payload.month,
      year: payload.year,
      monthName: preview.monthName,
      branchId: payload.branchId,
      processedBy: actorUserId,
      processedAt: new Date().toISOString(),
      status: 'draft',
      processedCount: payableItems.length,
      reconciliationStatus: preview.reconciliation.status,
      liabilityTotals: this.computeLiabilityTotals(preview.payrollItems),
      processedItems: [],
      totals: preview.reconciliation.totals,
      items: preview.payrollItems,
    });

    return {
      ...preview,
      status: 'draft',
      processedCount: payableItems.length,
      processedItems: [],
      message: `Draft payroll created for ${payableItems.length} employee(s). Approve then post to book expenses.`,
    };
  }

  async postPayrollRun(tenantId: string, actorUserId: string, runId: string) {
    const run = await this.hrService.getPayrollRunById(tenantId, runId);
    const status = run.status || 'posted';
    if (status === 'reversed') {
      throw new BadRequestException('Cannot post a reversed payroll run');
    }

    if (status === 'posted') {
      return {
        run,
        processedCount: run.processedItems?.length || 0,
        message: 'Payroll run is already posted',
      };
    }

    if (status !== 'approved') {
      throw new BadRequestException('Approve payroll run before posting');
    }

    const salaryCategoryId = await this.getOrCreateSalaryCategory(tenantId);
    const periodDate = new Date(run.year, run.month - 1, 1);
    const runItems = this.toPayrollRunItems(run.items);
    const processedItems = [] as Array<{
      salarySchemeId: string;
      employeeName: string;
      expenseId: string;
      amount: number;
    }>;

    for (const item of runItems) {
      if (Number(item.netPay || 0) <= 0) {
        continue;
      }

      const notes = [
        `Payroll ${run.monthName}`,
        `Base: ${Number(item.baseSalary || 0).toFixed(2)}`,
        `Template Bonus: ${Number(item.templateBonus || 0).toFixed(2)}`,
        `Template Commission: ${Number(item.templateCommission || 0).toFixed(2)}`,
        `Template Deduction: ${Number(item.templateDeduction || 0).toFixed(2)}`,
        `Manual Bonus: ${Number(item.manualBonus || 0).toFixed(2)}`,
        `Manual Commission: ${Number(item.manualCommission || 0).toFixed(2)}`,
        `Manual Deduction: ${Number(item.manualDeduction || 0).toFixed(2)}`,
        `Bonus: ${Number(item.bonus || 0).toFixed(2)}`,
        `Commission: ${Number(item.commission || 0).toFixed(2)}`,
        `Deduction: ${Number(item.deduction || 0).toFixed(2)}`,
        `NSSF: ${Number(item.statutory?.nssfEmployee || 0).toFixed(2)}`,
        `Health: ${Number(item.statutory?.healthInsuranceEmployee || 0).toFixed(2)}`,
        `Housing Levy: ${Number(item.statutory?.housingLevyEmployee || 0).toFixed(2)}`,
        `PAYE: ${Number(item.statutory?.paye || 0).toFixed(2)}`,
        `Net: ${Number(item.netPay || 0).toFixed(2)}`,
      ];

      if (item.note) {
        notes.push(`Note: ${item.note}`);
      }

      const expense = await this.expensesService.createExpense(
        {
          amount: Number(item.netPay || 0),
          description: `Payroll for ${String(item.employeeName || 'Employee')} - ${run.monthName}`,
          categoryId: salaryCategoryId,
          expenseType: 'one_time',
          branchId: item.branchId || run.branchId,
          notes: notes.join(' | '),
        },
        tenantId,
        String(item.userId || actorUserId),
      );

      const salarySchemeId =
        this.toStringOrUndefined(item.salarySchemeId) || '';
      if (salarySchemeId) {
        const existingScheme = await this.prisma.salaryScheme.findUnique({
          where: { id: salarySchemeId },
          select: {
            id: true,
            frequency: true,
            nextDueDate: true,
          },
        });

        if (existingScheme) {
          const nextDueDate = existingScheme.nextDueDate
            ? new Date(existingScheme.nextDueDate)
            : new Date(periodDate);

          if (existingScheme.frequency === 'monthly') {
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          } else if (existingScheme.frequency === 'yearly') {
            nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
          }

          await this.prisma.salaryScheme.update({
            where: { id: existingScheme.id },
            data: {
              lastPaidDate: periodDate,
              nextDueDate,
              updatedAt: new Date(),
            },
          });
        }
      }

      processedItems.push({
        salarySchemeId,
        employeeName: this.toStringOrUndefined(item.employeeName) || 'Employee',
        expenseId: expense.id,
        amount: Number(item.netPay || 0),
      });
    }

    const postedRun = await this.hrService.markPayrollRunPosted(
      tenantId,
      runId,
      actorUserId,
      {
        processedItems,
        liabilityTotals: this.computeLiabilityTotals(runItems),
      },
    );

    await this.auditLogService.log(
      actorUserId,
      'payroll_posted',
      {
        runId,
        month: run.month,
        year: run.year,
        processedCount: processedItems.length,
        totals: run.totals,
      },
      undefined,
    );

    return {
      run: postedRun,
      processedCount: processedItems.length,
      processedItems,
      message: `Posted payroll for ${processedItems.length} employee(s)`,
    };
  }

  async reversePayrollRun(
    tenantId: string,
    actorUserId: string,
    runId: string,
    reason?: string,
  ) {
    const run = await this.hrService.getPayrollRunById(tenantId, runId);
    const status = run.status || 'posted';
    if (status === 'reversed') {
      throw new BadRequestException('Payroll run already reversed');
    }

    if (status !== 'posted') {
      throw new BadRequestException(
        'Only posted payroll runs can be financially reversed',
      );
    }

    const processedItems = Array.isArray(run.processedItems)
      ? run.processedItems
      : [];
    let reversedExpenseCount = 0;
    for (const item of processedItems) {
      if (!item?.expenseId) {
        continue;
      }

      await this.expensesService.deleteExpense(
        item.expenseId,
        tenantId,
        run.branchId,
      );
      reversedExpenseCount += 1;
    }

    const reversedRun = await this.hrService.reversePayrollRun(
      tenantId,
      runId,
      actorUserId,
      reason,
    );

    await this.auditLogService.log(
      actorUserId,
      'payroll_reversed',
      {
        runId,
        month: run.month,
        year: run.year,
        reversedExpenseCount,
        reason: reason || 'Manual reversal',
      },
      undefined,
    );

    return {
      run: reversedRun,
      reversedExpenseCount,
      message: `Reversed payroll run and voided ${reversedExpenseCount} expense entr${
        reversedExpenseCount === 1 ? 'y' : 'ies'
      }`,
    };
  }

  async createSalaryScheme(
    dto: SalarySchemePayload,
    tenantId: string,
    userId: string,
  ) {
    const employeeName = this.toStringOrUndefined(dto.employeeName);
    const salaryAmount = this.toNumberOrUndefined(dto.salaryAmount);
    const frequency = this.toStringOrUndefined(dto.frequency);
    const startDateInput = dto.startDate;
    const note = this.toStringOrUndefined(dto.notes);

    // Validate required fields
    if (!employeeName) {
      throw new BadRequestException('Employee name is required');
    }
    if (!salaryAmount || salaryAmount <= 0) {
      throw new BadRequestException('Valid salary amount is required');
    }
    if (!frequency || !['monthly', 'yearly'].includes(frequency)) {
      throw new BadRequestException(
        'Valid frequency (monthly or yearly) is required',
      );
    }
    if (!startDateInput) {
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
    const startDate = new Date(startDateInput);

    // Calculate nextDueDate based on startDate and frequency
    const nextDueDate = new Date(startDate);
    if (frequency === 'monthly') {
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    } else if (frequency === 'yearly') {
      nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
    }

    // Create salary scheme record
    const salaryScheme = await this.prisma.salaryScheme.create({
      data: {
        id: salarySchemeId,
        tenantId,
        userId: validUserId || userId,
        employeeName,
        salaryAmount,
        frequency,
        startDate: startDate,
        nextDueDate: nextDueDate,
        branchId: validBranchId,
        notes: note,
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
          employeeName,
          salaryAmount,
          frequency,
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
            description: `Salary for ${employeeName}`,
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
        console.error(
          `Failed to sync salary scheme expense for ${scheme.id}:`,
          error,
        );
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
    const parsedQuery = this.toSalaryQuery(query as Record<string, unknown>);
    const whereClause: Prisma.SalarySchemeWhereInput = {
      tenantId,
      isActive: true,
    };

    // Filter by branch if specified
    if (branchId && branchId !== 'all') {
      whereClause.branchId = branchId;
    }

    // Search by employee name
    if (parsedQuery.search) {
      whereClause.employeeName = {
        contains: parsedQuery.search,
        mode: 'insensitive',
      };
    }

    // Filter by frequency if specified
    if (parsedQuery.frequency) {
      whereClause.frequency = parsedQuery.frequency;
    }

    // Sorting
    let orderBy: Prisma.SalarySchemeOrderByWithRelationInput = {
      createdAt: 'desc',
    };
    if (parsedQuery.sortBy) {
      const sortOrder = parsedQuery.sortOrder || 'desc';
      if (parsedQuery.sortBy === 'employeeName') {
        orderBy = { employeeName: sortOrder };
      } else if (parsedQuery.sortBy === 'salaryAmount') {
        orderBy = { salaryAmount: sortOrder };
      } else if (parsedQuery.sortBy === 'frequency') {
        orderBy = { frequency: sortOrder };
      } else if (parsedQuery.sortBy === 'startDate') {
        orderBy = { startDate: sortOrder };
      }
    }

    // Pagination
    const page = parsedQuery.page;
    const limit = parsedQuery.limit;
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

  async updateSalaryScheme(
    id: string,
    dto: Partial<SalarySchemePayload>,
    tenantId: string,
    branchId?: string,
  ) {
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
    const dtoBranchId = this.toStringOrUndefined(dto.branchId);
    let validBranchId: string | null =
      dtoBranchId || existingSalaryScheme.branchId;
    if (dtoBranchId) {
      const branchExists = await this.prisma.branch.findUnique({
        where: { id: dtoBranchId },
        select: { id: true, tenantId: true },
      });
      if (!branchExists || branchExists.tenantId !== tenantId) {
        console.warn(
          `Invalid branchId ${dtoBranchId} for tenant ${tenantId}, keeping existing`,
        );
        validBranchId = existingSalaryScheme.branchId;
      }
    }

    const employeeName = this.toStringOrUndefined(dto.employeeName);
    const notes = this.toStringOrUndefined(dto.notes);
    const salaryAmount = this.toNumberOrUndefined(dto.salaryAmount);
    const frequency = this.toStringOrUndefined(dto.frequency);
    const startDate = dto.startDate ? new Date(dto.startDate) : undefined;

    const updatedSalaryScheme = await this.prisma.salaryScheme.update({
      where: { id },
      data: {
        employeeName,
        salaryAmount,
        frequency,
        startDate,
        branchId: validBranchId,
        notes,
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
    const salarySchemesByFrequency: Record<
      string,
      { count: number; amount: number }
    > = {};
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
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

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
        if (
          startDate.getMonth() === now.getMonth() &&
          startDate.getFullYear() === now.getFullYear()
        ) {
          // If started this month, add the full yearly amount (assuming it's due this month)
          totalMonthlyAmount += scheme.salaryAmount;
        } else if (startDate <= endOfMonth) {
          // For ongoing yearly schemes, add 1/12 of the amount
          totalMonthlyAmount += scheme.salaryAmount / 12;
        }
      }
    });

    const monthName = now.toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });

    return {
      monthName,
      totalAmount: totalMonthlyAmount,
      salarySchemeCount: salarySchemes.length,
    };
  }

  async getSalaryTotalForMonth(
    tenantId: string,
    month: number,
    year: number,
    branchId?: string,
  ) {
    console.log(
      `getSalaryTotalForMonth called with tenantId: ${tenantId}, month: ${month}, year: ${year}`,
    );
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
    console.log(
      `Found ${salarySchemes.length} active salary schemes for tenant ${tenantId}`,
    );

    // Calculate total monthly salary expense
    let totalMonthlyAmount = 0;
    salarySchemes.forEach((scheme) => {
      console.log(
        `Processing scheme: ${scheme.employeeName}, frequency: ${scheme.frequency}, amount: ${scheme.salaryAmount}, startDate: ${scheme.startDate.toISOString()}`,
      );
      if (scheme.frequency === 'monthly') {
        // For monthly schemes, add the full amount if started before or during this month
        const startDate = new Date(scheme.startDate);
        if (startDate <= endOfMonth) {
          totalMonthlyAmount += scheme.salaryAmount;
          console.log(
            `Added monthly amount: ${scheme.salaryAmount}, total now: ${totalMonthlyAmount}`,
          );
        }
      } else if (scheme.frequency === 'yearly') {
        // For yearly schemes, prorate if the start date is in this month
        const startDate = new Date(scheme.startDate);
        if (
          startDate.getMonth() === month - 1 &&
          startDate.getFullYear() === year
        ) {
          // If started this month, add the full yearly amount (assuming it's due this month)
          totalMonthlyAmount += scheme.salaryAmount;
          console.log(
            `Added full yearly amount for new scheme: ${scheme.salaryAmount}, total now: ${totalMonthlyAmount}`,
          );
        } else if (startDate <= endOfMonth) {
          // For ongoing yearly schemes, add 1/12 of the amount
          const proratedAmount = scheme.salaryAmount / 12;
          totalMonthlyAmount += proratedAmount;
          console.log(
            `Added prorated yearly amount: ${proratedAmount}, total now: ${totalMonthlyAmount}`,
          );
        }
      }
    });

    const monthName = startOfMonth.toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });
    console.log(`Final total for ${monthName}: ${totalMonthlyAmount}`);

    return {
      monthName,
      totalAmount: totalMonthlyAmount,
      salarySchemeCount: salarySchemes.length,
    };
  }

  async getSalarySchemesByMonth(
    tenantId: string,
    month: number,
    year: number,
    branchId?: string,
    query?: Record<string, unknown>,
  ) {
    const parsedQuery = this.toSalaryQuery(query);
    const whereClause: Prisma.SalarySchemeWhereInput = {
      tenantId,
      isActive: true,
    };

    // Filter by branch if specified
    if (branchId && branchId !== 'all') {
      whereClause.branchId = branchId;
    }

    // Search by employee name
    if (parsedQuery.search) {
      whereClause.employeeName = {
        contains: parsedQuery.search,
        mode: 'insensitive',
      };
    }

    // Filter by frequency if specified
    if (parsedQuery.frequency) {
      whereClause.frequency = parsedQuery.frequency;
    }

    // Sorting
    let orderBy: Prisma.SalarySchemeOrderByWithRelationInput = {
      createdAt: 'desc',
    };
    if (parsedQuery.sortBy) {
      const sortOrder = parsedQuery.sortOrder || 'desc';
      if (parsedQuery.sortBy === 'employeeName') {
        orderBy = { employeeName: sortOrder };
      } else if (parsedQuery.sortBy === 'salaryAmount') {
        orderBy = { salaryAmount: sortOrder };
      } else if (parsedQuery.sortBy === 'frequency') {
        orderBy = { frequency: sortOrder };
      } else if (parsedQuery.sortBy === 'startDate') {
        orderBy = { startDate: sortOrder };
      }
    }

    // Pagination
    const page = parsedQuery.page;
    const limit = parsedQuery.limit;
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
    const salaryExpenses = salarySchemes.map((scheme) => ({
      id: 'salary-' + scheme.id,
      amount:
        scheme.frequency === 'monthly'
          ? scheme.salaryAmount
          : scheme.frequency === 'yearly'
            ? scheme.salaryAmount / 12
            : 0,
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
