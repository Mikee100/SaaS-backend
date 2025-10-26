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
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @Permissions('create_sales')
  async createExpense(@Body() createExpenseDto: any, @Req() req) {
    if (!req.user?.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    try {
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
  @Permissions('view_sales')
  async getExpenses(@Req() req, @Query() query: any) {
    const branchId = req.headers['x-branch-id'] as string;
    const result = await this.expensesService.getExpenses(req.user.tenantId, branchId, query);
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
  @Permissions('view_sales')
  async getExpenseById(@Param('id') id: string, @Req() req) {
    return this.expensesService.getExpenseById(id, req.user.tenantId);
  }

  @Put(':id')
  @Permissions('create_sales')
  async updateExpense(
    @Param('id') id: string,
    @Body() updateExpenseDto: any,
    @Req() req,
  ) {
    return this.expensesService.updateExpense(
      id,
      updateExpenseDto,
      req.user.tenantId,
    );
  }

  @Delete(':id')
  @Permissions('create_sales')
  async deleteExpense(@Param('id') id: string, @Req() req) {
    return this.expensesService.deleteExpense(id, req.user.tenantId);
  }

  @Get('analytics/summary')
  @Permissions('view_sales')
  async getExpenseAnalytics(@Req() req, @Query() query: any) {
    const { startDate, endDate } = query;
    return this.expensesService.getExpenseAnalytics(
      req.user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('categories/list')
  @Permissions('view_sales')
  async getExpenseCategories(@Req() req) {
    return this.expensesService.getExpenseCategories(req.user.tenantId);
  }

  @Get('comparison/branches')
  @Permissions('view_sales')
  async getBranchComparison(@Req() req, @Query() query: any) {
    const { startDate, endDate } = query;
    return this.expensesService.getBranchComparison(
      req.user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Post('reset-monthly')
  @Permissions('create_sales')
  async resetMonthlyExpenses(@Req() req) {
    return this.expensesService.resetMonthlyExpenses(req.user.tenantId, req.user.userId);
  }

  @Get('past-months')
  @Permissions('view_sales')
  async getPastMonthsRecords(@Req() req, @Query() query: any) {
    const { months = 12 } = query;
    return this.expensesService.getPastMonthsRecords(req.user.tenantId, parseInt(months));
  }
}
