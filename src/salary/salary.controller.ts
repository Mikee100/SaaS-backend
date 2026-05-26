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
import { SalaryService } from './salary.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('salary-schemes')
export class SalaryController {
  constructor(private readonly salaryService: SalaryService) {}

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
    const requestedBranchId =
      (req?.headers?.['x-branch-id'] as string | undefined) ||
      (req?.query?.branchId as string | undefined);
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
  @Permissions('create_sales')
  async createSalaryScheme(@Body() createSalarySchemeDto: any, @Req() req) {
    if (!req.user?.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    try {
      const effectiveBranchId = this.resolveBranchScope(req);
      if (effectiveBranchId) {
        createSalarySchemeDto.branchId = effectiveBranchId;
      }

      const salaryScheme = await this.salaryService.createSalaryScheme(
        createSalarySchemeDto,
        req.user.tenantId,
        req.user.userId,
      );
      return {
        success: true,
        data: salaryScheme,
        message: 'Salary scheme created successfully',
      };
    } catch (error) {
      console.error('Error creating salary scheme:', error);
      throw new InternalServerErrorException('Failed to create salary scheme');
    }
  }

  @Post('sync-expenses')
  @Permissions('create_sales')
  async syncSalarySchemeExpenses(@Req() req) {
    if (!req.user?.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const effectiveBranchId = this.resolveBranchScope(req);
    const result = await this.salaryService.syncSalarySchemeExpenses(
      req.user.tenantId,
      req.user.userId,
      effectiveBranchId,
    );

    return {
      success: true,
      data: result,
      message: 'Salary expense synchronization completed',
    };
  }

  @Get()
  @Permissions('view_sales')
  async getSalarySchemes(@Req() req, @Query() query: any) {
    const effectiveBranchId = this.resolveBranchScope(req);
    const result = await this.salaryService.getSalarySchemes(
      req.user.tenantId,
      effectiveBranchId,
      query,
    );
    return {
      success: true,
      data: result.salarySchemes,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Get('analytics/summary')
  @Permissions('view_sales')
  async getSalaryAnalytics(@Req() req, @Query() query: any) {
    const { startDate, endDate } = query;
    const effectiveBranchId = this.resolveBranchScope(req);
    return this.salaryService.getSalaryAnalytics(
      req.user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      effectiveBranchId,
    );
  }

  @Get('current-month-total')
  @Permissions('view_sales')
  async getCurrentMonthSalaryTotal(@Req() req) {
    const effectiveBranchId = this.resolveBranchScope(req);
    const result = await this.salaryService.getCurrentMonthSalaryTotal(
      req.user.tenantId,
      effectiveBranchId,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get('total-expense')
  @Permissions('view_sales')
  async getSalaryTotalForMonth(@Req() req, @Query('month') month: number, @Query('year') year: number) {
    if (!month || !year || month < 1 || month > 12 || year < 1900 || year > 2100) {
      throw new BadRequestException('Valid month (1-12) and year (1900-2100) are required');
    }
    const effectiveBranchId = this.resolveBranchScope(req);
    const result = await this.salaryService.getSalaryTotalForMonth(
      req.user.tenantId,
      month,
      year,
      effectiveBranchId,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get('by-month')
  @Permissions('view_sales')
  async getSalarySchemesByMonth(@Req() req, @Query() query: any) {
    const { month, year } = query;
    if (!month || !year || month < 1 || month > 12 || year < 1900 || year > 2100) {
      throw new BadRequestException('Valid month (1-12) and year (1900-2100) are required');
    }
    const effectiveBranchId = this.resolveBranchScope(req);
    const result = await this.salaryService.getSalarySchemesByMonth(
      req.user.tenantId,
      parseInt(month),
      parseInt(year),
      effectiveBranchId,
      query,
    );
    return {
      success: true,
      data: result.salarySchemes,
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
  async getSalarySchemeById(@Param('id') id: string, @Req() req) {
    const effectiveBranchId = this.resolveBranchScope(req);
    return this.salaryService.getSalarySchemeById(id, req.user.tenantId, effectiveBranchId);
  }

  @Put(':id')
  @Permissions('create_sales')
  async updateSalaryScheme(
    @Param('id') id: string,
    @Body() updateSalarySchemeDto: any,
    @Req() req,
  ) {
    const effectiveBranchId = this.resolveBranchScope(req);
    if (effectiveBranchId) {
      updateSalarySchemeDto.branchId = effectiveBranchId;
    }

    return this.salaryService.updateSalaryScheme(
      id,
      updateSalarySchemeDto,
      req.user.tenantId,
      effectiveBranchId,
    );
  }

  @Delete(':id')
  @Permissions('create_sales')
  async deleteSalaryScheme(@Param('id') id: string, @Req() req) {
    const effectiveBranchId = this.resolveBranchScope(req);
    return this.salaryService.deleteSalaryScheme(id, req.user.tenantId, effectiveBranchId);
  }
}
