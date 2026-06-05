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
import { RequireModules } from '../auth/module-access.decorator';
import { AuthenticatedRequest, AuthenticatedUser } from '../auth/request.types';
import {
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequireModules('payroll')
@Controller('salary-schemes')
export class SalaryController {
  constructor(private readonly salaryService: SalaryService) {}

  private normalizeAdjustments(rawAdjustments: unknown): Array<{
    salarySchemeId: string;
    bonus?: number;
    commission?: number;
    deduction?: number;
    paidAmount?: number;
    note?: string;
  }> {
    if (!Array.isArray(rawAdjustments)) {
      return [];
    }

    return rawAdjustments
      .filter((item): item is Record<string, unknown> => this.isRecord(item))
      .map((item) => {
        const salarySchemeId = this.toStringOrUndefined(item.salarySchemeId);
        if (!salarySchemeId) {
          return null;
        }

        return {
          salarySchemeId,
          bonus: this.toNumberOrUndefined(item.bonus),
          commission: this.toNumberOrUndefined(item.commission),
          deduction: this.toNumberOrUndefined(item.deduction),
          paidAmount: this.toNumberOrUndefined(item.paidAmount),
          note: this.toStringOrUndefined(item.note),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }

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

  private getTenantId(req: AuthenticatedRequest): string {
    const tenantId = this.toStringOrUndefined(req.user?.tenantId);
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return tenantId;
  }

  private getActorUserId(req: AuthenticatedRequest): string {
    const userId = this.toStringOrUndefined(req.user?.userId);
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    return userId;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private toRoleName(role: unknown): string {
    if (typeof role === 'string') {
      return role.toLowerCase();
    }
    if (this.isRecord(role) && typeof role.name === 'string') {
      return role.name.toLowerCase();
    }
    return '';
  }

  private getNormalizedRoleNames(user: AuthenticatedUser): string[] {
    const roles: unknown[] = [];

    if (Array.isArray(user?.roles)) {
      roles.push(...user.roles);
    }

    if (user?.role) {
      roles.push(user.role);
    }

    return roles.map((role) => this.toRoleName(role)).filter(Boolean);
  }

  private resolveBranchScope(
    req: AuthenticatedRequest,
    query?: Record<string, unknown>,
  ): string | undefined {
    const roles = this.getNormalizedRoleNames(req?.user);
    const assignedBranchId = this.toStringOrUndefined(req?.user?.branchId);
    const requestedBranchId =
      this.toStringOrUndefined(req?.headers?.['x-branch-id']) ||
      this.toStringOrUndefined(query?.branchId);
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
  @Permissions('create_sales')
  async createSalaryScheme(
    @Body() createSalarySchemeDto: Record<string, unknown>,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    const actorUserId = this.getActorUserId(req);

    try {
      const effectiveBranchId = this.resolveBranchScope(req);
      if (effectiveBranchId) {
        createSalarySchemeDto.branchId = effectiveBranchId;
      }

      const salaryScheme = await this.salaryService.createSalaryScheme(
        createSalarySchemeDto,
        tenantId,
        actorUserId,
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
  async syncSalarySchemeExpenses(@Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    const actorUserId = this.getActorUserId(req);

    const effectiveBranchId = this.resolveBranchScope(req);
    const result = await this.salaryService.syncSalarySchemeExpenses(
      tenantId,
      actorUserId,
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
  async getSalarySchemes(
    @Req() req: AuthenticatedRequest,
    @Query() query: Record<string, unknown>,
  ) {
    const tenantId = this.getTenantId(req);
    const effectiveBranchId = this.resolveBranchScope(req, query);
    const result = await this.salaryService.getSalarySchemes(
      tenantId,
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
  async getSalaryAnalytics(
    @Req() req: AuthenticatedRequest,
    @Query() query: Record<string, unknown>,
  ) {
    const tenantId = this.getTenantId(req);
    const startDateString = this.toStringOrUndefined(query.startDate);
    const endDateString = this.toStringOrUndefined(query.endDate);
    const effectiveBranchId = this.resolveBranchScope(req, query);
    return this.salaryService.getSalaryAnalytics(
      tenantId,
      startDateString ? new Date(startDateString) : undefined,
      endDateString ? new Date(endDateString) : undefined,
      effectiveBranchId,
    );
  }

  @Get('current-month-total')
  @Permissions('view_sales')
  async getCurrentMonthSalaryTotal(@Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    const effectiveBranchId = this.resolveBranchScope(req);
    const result = await this.salaryService.getCurrentMonthSalaryTotal(
      tenantId,
      effectiveBranchId,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get('total-expense')
  @Permissions('view_sales')
  async getSalaryTotalForMonth(
    @Req() req: AuthenticatedRequest,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    const tenantId = this.getTenantId(req);
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
    const effectiveBranchId = this.resolveBranchScope(req);
    const result = await this.salaryService.getSalaryTotalForMonth(
      tenantId,
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
  async getSalarySchemesByMonth(
    @Req() req: AuthenticatedRequest,
    @Query() query: Record<string, unknown>,
  ) {
    const tenantId = this.getTenantId(req);
    const month = this.toNumberOrUndefined(query.month);
    const year = this.toNumberOrUndefined(query.year);
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
    const effectiveBranchId = this.resolveBranchScope(req, query);
    const result = await this.salaryService.getSalarySchemesByMonth(
      tenantId,
      month,
      year,
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

  @Post('payroll-preview')
  @Permissions('view_sales')
  async payrollPreview(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      month?: unknown;
      year?: unknown;
      adjustments?: unknown;
      applyTemplates?: unknown;
    },
  ) {
    const tenantId = this.getTenantId(req);
    const month = this.toNumberOrUndefined(body?.month);
    const year = this.toNumberOrUndefined(body?.year);
    const applyTemplates = body?.applyTemplates;
    const adjustments = this.normalizeAdjustments(body?.adjustments);
    if (!month || !year) {
      throw new BadRequestException('Month and year are required');
    }

    const effectiveBranchId = this.resolveBranchScope(req);
    const preview = await this.salaryService.buildPayrollPreview(
      tenantId,
      month,
      year,
      effectiveBranchId,
      applyTemplates !== false,
      adjustments,
    );

    return {
      success: true,
      data: preview,
    };
  }

  @Post('process-payroll')
  @Permissions('create_sales')
  async processPayroll(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      month?: unknown;
      year?: unknown;
      adjustments?: unknown;
      applyTemplates?: unknown;
    },
  ) {
    const tenantId = this.getTenantId(req);
    const actorUserId = this.getActorUserId(req);
    const month = this.toNumberOrUndefined(body?.month);
    const year = this.toNumberOrUndefined(body?.year);
    const applyTemplates = body?.applyTemplates;
    const adjustments = this.normalizeAdjustments(body?.adjustments);
    if (!month || !year) {
      throw new BadRequestException('Month and year are required');
    }

    const effectiveBranchId = this.resolveBranchScope(req);
    const result = await this.salaryService.processPayroll(
      tenantId,
      actorUserId,
      {
        month,
        year,
        branchId: effectiveBranchId,
        applyTemplates: applyTemplates !== false,
        adjustments,
      },
    );

    return {
      success: true,
      data: result,
      message: result.message,
    };
  }

  @Post('payroll-runs/:id/post')
  @Permissions('create_sales')
  async postPayrollRun(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const tenantId = this.getTenantId(req);
    const actorUserId = this.getActorUserId(req);
    const result = await this.salaryService.postPayrollRun(
      tenantId,
      actorUserId,
      id,
    );
    return {
      success: true,
      data: result,
      message: result.message,
    };
  }

  @Post('payroll-runs/:id/reverse')
  @Permissions('create_sales')
  async reversePayrollRun(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { reason?: unknown },
  ) {
    const tenantId = this.getTenantId(req);
    const actorUserId = this.getActorUserId(req);
    const result = await this.salaryService.reversePayrollRun(
      tenantId,
      actorUserId,
      id,
      this.toStringOrUndefined(body?.reason),
    );
    return {
      success: true,
      data: result,
      message: result.message,
    };
  }

  @Get(':id')
  @Permissions('view_sales')
  async getSalarySchemeById(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    const effectiveBranchId = this.resolveBranchScope(req);
    return this.salaryService.getSalarySchemeById(
      id,
      tenantId,
      effectiveBranchId,
    );
  }

  @Put(':id')
  @Permissions('create_sales')
  async updateSalaryScheme(
    @Param('id') id: string,
    @Body() updateSalarySchemeDto: Record<string, unknown>,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    const effectiveBranchId = this.resolveBranchScope(req);
    if (effectiveBranchId) {
      updateSalarySchemeDto.branchId = effectiveBranchId;
    }

    return this.salaryService.updateSalaryScheme(
      id,
      updateSalarySchemeDto,
      tenantId,
      effectiveBranchId,
    );
  }

  @Delete(':id')
  @Permissions('create_sales')
  async deleteSalaryScheme(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    const effectiveBranchId = this.resolveBranchScope(req);
    return this.salaryService.deleteSalaryScheme(
      id,
      tenantId,
      effectiveBranchId,
    );
  }
}
