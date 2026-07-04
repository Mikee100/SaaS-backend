import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { RequireModules } from '../auth/module-access.decorator';
import {
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthenticatedRequest, AuthenticatedUser } from '../auth/request.types';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequireModules('expenses')
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  private getTenantId(req: AuthenticatedRequest): string {
    if (!req.user?.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return req.user.tenantId;
  }

  private getUserId(req: AuthenticatedRequest): string {
    if (!req.user?.userId) {
      throw new BadRequestException('User ID is required');
    }
    return req.user.userId;
  }

  private getNormalizedRoleNames(
    user: AuthenticatedUser | undefined,
  ): string[] {
    const roles: string[] = [];

    if (Array.isArray(user?.roles)) {
      for (const role of user.roles) {
        if (typeof role === 'string' && role.trim()) {
          roles.push(role.toLowerCase());
        }
      }
    }

    if (typeof user?.role === 'string' && user.role.trim()) {
      roles.push(user.role.toLowerCase());
    }

    return roles;
  }

  private getHeaderBranchId(req: AuthenticatedRequest): string | undefined {
    const headerValue = req.headers['x-branch-id'];
    if (typeof headerValue === 'string' && headerValue.trim()) {
      return headerValue.trim();
    }
    return undefined;
  }

  private resolveBranchScope(
    req: AuthenticatedRequest,
    queryBranchId?: string,
  ): string | undefined {
    const roles = this.getNormalizedRoleNames(req.user);
    const assignedBranchId = req.user?.branchId;
    const normalizedQueryBranchId =
      typeof queryBranchId === 'string' && queryBranchId.trim()
        ? queryBranchId.trim()
        : undefined;
    const requestedBranchId = normalizedQueryBranchId || this.getHeaderBranchId(req);
    const isBranchScopedRole =
      roles.includes('manager') || roles.includes('cashier');

    if (isBranchScopedRole) {
      if (!assignedBranchId) {
        throw new ForbiddenException(
          'Your account is branch-scoped but has no assigned branch. Contact an admin.',
        );
      }
      return assignedBranchId;
    }

    if (requestedBranchId && requestedBranchId !== 'all') {
      return requestedBranchId;
    }

    return undefined;
  }

  @Post()
  @Permissions('manage_expenses')
  async createExpense(
    @Body() createExpenseDto: Record<string, unknown>,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const tenantId = this.getTenantId(req);
      const userId = this.getUserId(req);
      const effectiveBranchId = this.resolveBranchScope(req);
      const payload =
        effectiveBranchId !== undefined
          ? { ...createExpenseDto, branchId: effectiveBranchId }
          : createExpenseDto;

      const expense = await this.expensesService.createExpense(
        payload,
        tenantId,
        userId,
      );
      return {
        success: true,
        data: expense,
        message: 'Expense created successfully',
      };
    } catch (error) {
      console.error('Error creating expense:', error);
      throw new InternalServerErrorException('Failed to create expense');
    }
  }

  @Get()
  @Permissions('view_expenses')
  async getExpenses(
    @Req() req: AuthenticatedRequest,
    @Query() query: Record<string, unknown>,
  ) {
    const effectiveBranchId = this.resolveBranchScope(req);
    const tenantId = this.getTenantId(req);
    const result = await this.expensesService.getExpenses(
      tenantId,
      effectiveBranchId,
      query,
    );
    return {
      success: true,
      data: result.expenses,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Get('analytics/summary')
  @Permissions('view_expenses')
  async getExpenseAnalytics(
    @Req() req: AuthenticatedRequest,
    @Query() query: { startDate?: string; endDate?: string },
  ) {
    const { startDate, endDate } = query;
    const effectiveBranchId = this.resolveBranchScope(req);
    return this.expensesService.getExpenseAnalytics(
      this.getTenantId(req),
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      effectiveBranchId,
    );
  }

  @Get('categories/list')
  @Permissions('view_expenses')
  async getExpenseCategories(@Req() req: AuthenticatedRequest) {
    return this.expensesService.getExpenseCategories(this.getTenantId(req));
  }

  @Get('comparison/branches')
  @Permissions('view_expenses')
  async getBranchComparison(
    @Req() req: AuthenticatedRequest,
    @Query() query: { startDate?: string; endDate?: string; branchId?: string },
  ) {
    const { startDate, endDate } = query;
    const effectiveBranchId = this.resolveBranchScope(req, query.branchId);
    return this.expensesService.getBranchComparison(
      this.getTenantId(req),
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      effectiveBranchId,
    );
  }

  @Post('reset-monthly')
  @Permissions('manage_expenses')
  async resetMonthlyExpenses(@Req() req: AuthenticatedRequest) {
    const effectiveBranchId = this.resolveBranchScope(req);
    return this.expensesService.resetMonthlyExpenses(
      this.getTenantId(req),
      this.getUserId(req),
      effectiveBranchId,
    );
  }

  @Get('past-months')
  @Permissions('view_expenses')
  async getPastMonthsRecords(
    @Req() req: AuthenticatedRequest,
    @Query() query: { months?: string; branchId?: string },
  ) {
    const monthsRaw = query.months ?? '12';
    const months = Number.parseInt(monthsRaw, 10);
    const effectiveBranchId = this.resolveBranchScope(req, query.branchId);
    return this.expensesService.getPastMonthsRecords(
      this.getTenantId(req),
      Number.isFinite(months) ? months : 12,
      effectiveBranchId,
    );
  }

  @Get('current-month-total')
  @Permissions('view_expenses')
  async getCurrentMonthExpenseTotal(
    @Req() req: AuthenticatedRequest,
    @Query('branchId') branchId?: string,
  ) {
    const effectiveBranchId = this.resolveBranchScope(req, branchId);
    const result = await this.expensesService.getCurrentMonthExpenseTotal(
      this.getTenantId(req),
      effectiveBranchId,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get('total-expense')
  @Permissions('view_expenses')
  async getExpenseTotalForMonth(
    @Req() req: AuthenticatedRequest,
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('branchId') branchId?: string,
  ) {
    const parsedMonth = Number(month);
    const parsedYear = Number(year);
    if (
      !parsedMonth ||
      !parsedYear ||
      parsedMonth < 1 ||
      parsedMonth > 12 ||
      parsedYear < 1900 ||
      parsedYear > 2100
    ) {
      throw new BadRequestException(
        'Valid month (1-12) and year (1900-2100) are required',
      );
    }
    const effectiveBranchId = this.resolveBranchScope(req, branchId);
    const result = await this.expensesService.getExpenseTotalForMonth(
      this.getTenantId(req),
      parsedMonth,
      parsedYear,
      effectiveBranchId,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get('by-month')
  @Permissions('view_expenses')
  async getExpensesByMonth(
    @Req() req: AuthenticatedRequest,
    @Query() query: Record<string, unknown>,
  ) {
    const month = typeof query.month === 'string' ? Number(query.month) : NaN;
    const year = typeof query.year === 'string' ? Number(query.year) : NaN;
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
    const requestedBranchId =
      typeof query.branchId === 'string' ? query.branchId : undefined;
    const effectiveBranchId = this.resolveBranchScope(req, requestedBranchId);
    const result = await this.expensesService.getExpensesByMonth(
      this.getTenantId(req),
      month,
      year,
      effectiveBranchId,
      query,
    );
    return {
      success: true,
      data: result.expenses,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Get(':id')
  @Permissions('view_expenses')
  async getExpenseById(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const effectiveBranchId = this.resolveBranchScope(req);
    return this.expensesService.getExpenseById(
      id,
      this.getTenantId(req),
      effectiveBranchId,
    );
  }

  @Put(':id')
  @Permissions('manage_expenses')
  async updateExpense(
    @Param('id') id: string,
    @Body() updateExpenseDto: Record<string, unknown>,
    @Req() req: AuthenticatedRequest,
  ) {
    const effectiveBranchId = this.resolveBranchScope(req);
    const payload =
      effectiveBranchId !== undefined
        ? { ...updateExpenseDto, branchId: effectiveBranchId }
        : updateExpenseDto;

    return this.expensesService.updateExpense(
      id,
      payload,
      this.getTenantId(req),
      effectiveBranchId,
    );
  }

  @Delete(':id')
  @Permissions('manage_expenses')
  async deleteExpense(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const effectiveBranchId = this.resolveBranchScope(req);
    return this.expensesService.deleteExpense(
      id,
      this.getTenantId(req),
      effectiveBranchId,
    );
  }
}
