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
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequireModules('expenses')
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  private getNormalizedRoleNames(user: any): string[] {
    const roles: any[] = [];

    if (Array.isArray(user?.roles)) {
      roles.push(...user.roles);
    }

    if (user?.role) {
      roles.push(user.role);
    }

    return roles
      .map((role: any) =>
        typeof role === 'string' ? role.toLowerCase() : String(role?.name || '').toLowerCase(),
      )
      .filter(Boolean);
  }

  private resolveBranchScope(req: any): string | undefined {
    const roles = this.getNormalizedRoleNames(req?.user);
    const assignedBranchId = req?.user?.branchId as string | undefined;
    const requestedBranchId = req?.headers?.['x-branch-id'] as string | undefined;
    const isBranchScopedRole = roles.includes('manager') || roles.includes('cashier');

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
  async createExpense(@Body() createExpenseDto: any, @Req() req) {
    if (!req.user?.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    try {
      const effectiveBranchId = this.resolveBranchScope(req);
      if (effectiveBranchId) {
        createExpenseDto.branchId = effectiveBranchId;
      }

      const expense = await this.expensesService.createExpense(
        createExpenseDto,
        req.user.tenantId,
        req.user.userId,
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
  async getExpenses(@Req() req, @Query() query: any) {
    const effectiveBranchId = this.resolveBranchScope(req);
    const result = await this.expensesService.getExpenses(req.user.tenantId, effectiveBranchId, query);
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
  async getExpenseById(@Param('id') id: string, @Req() req) {
    const effectiveBranchId = this.resolveBranchScope(req);
    return this.expensesService.getExpenseById(id, req.user.tenantId, effectiveBranchId);
  }

  @Put(':id')
  @Permissions('manage_expenses')
  async updateExpense(
    @Param('id') id: string,
    @Body() updateExpenseDto: any,
    @Req() req,
  ) {
    const effectiveBranchId = this.resolveBranchScope(req);
    if (effectiveBranchId) {
      updateExpenseDto.branchId = effectiveBranchId;
    }

    return this.expensesService.updateExpense(
      id,
      updateExpenseDto,
      req.user.tenantId,
      effectiveBranchId,
    );
  }

  @Delete(':id')
  @Permissions('manage_expenses')
  async deleteExpense(@Param('id') id: string, @Req() req) {
    const effectiveBranchId = this.resolveBranchScope(req);
    return this.expensesService.deleteExpense(id, req.user.tenantId, effectiveBranchId);
  }

  @Get('analytics/summary')
  @Permissions('view_expenses')
  async getExpenseAnalytics(@Req() req, @Query() query: any) {
    const { startDate, endDate } = query;
    const effectiveBranchId = this.resolveBranchScope(req);
    return this.expensesService.getExpenseAnalytics(
      req.user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      effectiveBranchId,
    );
  }

  @Get('categories/list')
  @Permissions('view_expenses')
  async getExpenseCategories(@Req() req) {
    return this.expensesService.getExpenseCategories(req.user.tenantId);
  }

  @Get('comparison/branches')
  @Permissions('view_expenses')
  async getBranchComparison(@Req() req, @Query() query: any) {
    const { startDate, endDate } = query;
    const effectiveBranchId = this.resolveBranchScope(req);
    return this.expensesService.getBranchComparison(
      req.user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      effectiveBranchId,
    );
  }

  @Post('reset-monthly')
  @Permissions('manage_expenses')
  async resetMonthlyExpenses(@Req() req) {
    const effectiveBranchId = this.resolveBranchScope(req);
    return this.expensesService.resetMonthlyExpenses(req.user.tenantId, req.user.userId, effectiveBranchId);
  }

  @Get('past-months')
  @Permissions('view_expenses')
  async getPastMonthsRecords(@Req() req, @Query() query: any) {
    const { months = 12 } = query;
    const effectiveBranchId = this.resolveBranchScope(req);
    return this.expensesService.getPastMonthsRecords(req.user.tenantId, parseInt(months), effectiveBranchId);
  }

  @Get('current-month-total')
  @Permissions('view_expenses')
  async getCurrentMonthExpenseTotal(@Req() req) {
    const effectiveBranchId = this.resolveBranchScope(req);
    const result = await this.expensesService.getCurrentMonthExpenseTotal(req.user.tenantId, effectiveBranchId);
    return {
      success: true,
      data: result,
    };
  }

  @Get('total-expense')
  @Permissions('view_expenses')
  async getExpenseTotalForMonth(@Req() req, @Query('month') month: number, @Query('year') year: number) {
    if (!month || !year || month < 1 || month > 12 || year < 1900 || year > 2100) {
      throw new BadRequestException('Valid month (1-12) and year (1900-2100) are required');
    }
    const effectiveBranchId = this.resolveBranchScope(req);
    const result = await this.expensesService.getExpenseTotalForMonth(req.user.tenantId, month, year, effectiveBranchId);
    return {
      success: true,
      data: result,
    };
  }

  @Get('by-month')
  @Permissions('view_expenses')
  async getExpensesByMonth(@Req() req, @Query() query: any) {
    const { month, year } = query;
    if (!month || !year || month < 1 || month > 12 || year < 1900 || year > 2100) {
      throw new BadRequestException('Valid month (1-12) and year (1900-2100) are required');
    }
    const effectiveBranchId = this.resolveBranchScope(req);
    const result = await this.expensesService.getExpensesByMonth(req.user.tenantId, parseInt(month), parseInt(year), effectiveBranchId, query);
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
}
