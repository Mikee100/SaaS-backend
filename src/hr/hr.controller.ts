import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequireModules } from '../auth/module-access.decorator';
import { AuthenticatedRequest, AuthenticatedUser } from '../auth/request.types';
import { HrService } from './hr.service';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequireModules('payroll')
@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  private getTenantId(req: AuthenticatedRequest): string {
    if (!req.user?.tenantId) {
      throw new BadRequestException(
        'User context is missing or invalid. Authentication required.',
      );
    }
    return req.user.tenantId;
  }

  private getUserId(req: AuthenticatedRequest): string {
    if (!req.user?.userId) {
      throw new BadRequestException(
        'User context is missing or invalid. Authentication required.',
      );
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
    const requestedBranchId = this.getHeaderBranchId(req) || queryBranchId;
    const isBranchScopedRole =
      roles.includes('manager') || roles.includes('cashier');

    if (isBranchScopedRole) {
      if (!assignedBranchId) {
        throw new BadRequestException(
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

  @Get('employees')
  @Permissions('view_sales')
  async listEmployees(
    @Req() req: AuthenticatedRequest,
    @Query('branchId') branchId?: string,
    @Query('search') search?: string,
  ) {
    const tenantId = this.getTenantId(req);
    const employees = await this.hrService.listEmployees(
      tenantId,
      branchId,
      search,
    );
    return { success: true, data: employees };
  }

  @Post('employees')
  @Permissions('create_sales')
  async createEmployee(
    @Req() req: AuthenticatedRequest,
    @Body() body: Record<string, unknown>,
  ) {
    const tenantId = this.getTenantId(req);
    const employee = await this.hrService.createEmployee(tenantId, body || {});
    return {
      success: true,
      data: employee,
      message: 'Employee profile created',
    };
  }

  @Put('employees/:id')
  @Permissions('create_sales')
  async updateEmployee(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const tenantId = this.getTenantId(req);
    const employee = await this.hrService.updateEmployee(
      tenantId,
      id,
      body || {},
    );
    return {
      success: true,
      data: employee,
      message: 'Employee profile updated',
    };
  }

  @Delete('employees/:id')
  @Permissions('create_sales')
  async deleteEmployee(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    await this.hrService.deleteEmployee(this.getTenantId(req), id);
    return { success: true, message: 'Employee profile deleted' };
  }

  @Get('payroll-templates')
  @Permissions('view_sales')
  async listTemplates(
    @Req() req: AuthenticatedRequest,
    @Query('active') active?: string,
  ) {
    const tenantId = this.getTenantId(req);
    const onlyActive = active === '1' || active === 'true';
    const templates = await this.hrService.listPayrollTemplates(
      tenantId,
      onlyActive,
    );
    return { success: true, data: templates };
  }

  @Post('payroll-templates')
  @Permissions('create_sales')
  async createTemplate(
    @Req() req: AuthenticatedRequest,
    @Body() body: Record<string, unknown>,
  ) {
    const tenantId = this.getTenantId(req);
    const template = await this.hrService.createPayrollTemplate(
      tenantId,
      body || {},
    );
    return {
      success: true,
      data: template,
      message: 'Payroll template created',
    };
  }

  @Put('payroll-templates/:id')
  @Permissions('create_sales')
  async updateTemplate(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const tenantId = this.getTenantId(req);
    const template = await this.hrService.updatePayrollTemplate(
      tenantId,
      id,
      body || {},
    );
    return {
      success: true,
      data: template,
      message: 'Payroll template updated',
    };
  }

  @Delete('payroll-templates/:id')
  @Permissions('create_sales')
  async deleteTemplate(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    await this.hrService.deletePayrollTemplate(this.getTenantId(req), id);
    return { success: true, message: 'Payroll template deleted' };
  }

  @Get('payroll-runs')
  @Permissions('view_sales')
  async listPayrollRuns(
    @Req() req: AuthenticatedRequest,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
  ) {
    const monthNum = month ? Number(month) : undefined;
    const yearNum = year ? Number(year) : undefined;

    if (month && (!monthNum || monthNum < 1 || monthNum > 12)) {
      throw new BadRequestException('Month must be between 1 and 12');
    }

    if (year && (!yearNum || yearNum < 1900 || yearNum > 2100)) {
      throw new BadRequestException('Year must be between 1900 and 2100');
    }

    const effectiveBranchId = this.resolveBranchScope(req, branchId);
    const tenantId = this.getTenantId(req);
    const runs = await this.hrService.listPayrollRuns(
      tenantId,
      monthNum,
      yearNum,
      effectiveBranchId,
      status,
    );
    return { success: true, data: runs };
  }

  @Get('payroll-runs/:id')
  @Permissions('view_sales')
  async getPayrollRun(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const effectiveBranchId = this.resolveBranchScope(req);
    const run = await this.hrService.getPayrollRunById(
      this.getTenantId(req),
      id,
      effectiveBranchId,
    );
    return { success: true, data: run };
  }

  @Post('payroll-runs/:id/approve')
  @Permissions('create_sales')
  async approvePayrollRun(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const run = await this.hrService.approvePayrollRun(
      this.getTenantId(req),
      id,
      this.getUserId(req),
    );
    return { success: true, data: run, message: 'Payroll run approved' };
  }

  @Post('payroll-runs/:id/cancel')
  @Permissions('create_sales')
  async cancelPayrollRun(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    const run = await this.hrService.cancelPayrollRun(
      this.getTenantId(req),
      id,
      this.getUserId(req),
      body?.reason,
    );
    return { success: true, data: run, message: 'Payroll draft cancelled' };
  }

  @Post('payroll-runs/:id/reverse')
  @Permissions('create_sales')
  reversePayrollRun() {
    throw new BadRequestException(
      'Use POST /salary-schemes/payroll-runs/:id/reverse for financial reversal',
    );
  }

  @Get('payroll-period-locks')
  @Permissions('view_sales')
  async getPayrollPeriodLocks(@Req() req: AuthenticatedRequest) {
    const locks = await this.hrService.listPayrollPeriodLocks(
      this.getTenantId(req),
    );
    return { success: true, data: locks };
  }

  @Post('payroll-period-locks')
  @Permissions('create_sales')
  async lockPayrollPeriod(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      month?: string | number;
      year?: string | number;
      branchId?: string;
      reason?: string;
    },
  ) {
    const month = Number(body?.month);
    const year = Number(body?.year);
    if (
      !month ||
      month < 1 ||
      month > 12 ||
      !year ||
      year < 1900 ||
      year > 2100
    ) {
      throw new BadRequestException('Valid month and year are required');
    }

    const lock = await this.hrService.lockPayrollPeriod(this.getTenantId(req), {
      month,
      year,
      branchId: body?.branchId,
      reason: body?.reason,
      lockedBy: this.getUserId(req),
    });

    return { success: true, data: lock, message: 'Payroll period locked' };
  }

  @Delete('payroll-period-locks')
  @Permissions('create_sales')
  async unlockPayrollPeriod(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      month?: string | number;
      year?: string | number;
      branchId?: string;
    },
  ) {
    const month = Number(body?.month);
    const year = Number(body?.year);
    if (
      !month ||
      month < 1 ||
      month > 12 ||
      !year ||
      year < 1900 ||
      year > 2100
    ) {
      throw new BadRequestException('Valid month and year are required');
    }

    await this.hrService.unlockPayrollPeriod(this.getTenantId(req), {
      month,
      year,
      branchId: body?.branchId,
    });

    return { success: true, message: 'Payroll period unlocked' };
  }

  @Post('payroll-period-locks/unlock')
  @Permissions('create_sales')
  async unlockPayrollPeriodPost(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      month?: string | number;
      year?: string | number;
      branchId?: string;
    },
  ) {
    const month = Number(body?.month);
    const year = Number(body?.year);
    if (
      !month ||
      month < 1 ||
      month > 12 ||
      !year ||
      year < 1900 ||
      year > 2100
    ) {
      throw new BadRequestException('Valid month and year are required');
    }

    await this.hrService.unlockPayrollPeriod(this.getTenantId(req), {
      month,
      year,
      branchId: body?.branchId,
    });

    return { success: true, message: 'Payroll period unlocked' };
  }

  @Get('payroll-settings')
  @Permissions('view_sales')
  async getPayrollSettings(@Req() req: AuthenticatedRequest) {
    const settings = await this.hrService.getPayrollSettings(
      this.getTenantId(req),
    );
    return { success: true, data: settings };
  }

  @Put('payroll-settings')
  @Permissions('create_sales')
  async updatePayrollSettings(
    @Req() req: AuthenticatedRequest,
    @Body() body: Record<string, unknown>,
  ) {
    const settings = await this.hrService.updatePayrollSettings(
      this.getTenantId(req),
      body || {},
    );
    return {
      success: true,
      data: settings,
      message: 'Payroll settings updated',
    };
  }

  @Get('payroll-tax-presets')
  @Permissions('view_sales')
  getTaxPresets() {
    return { success: true, data: this.hrService.listKenyaTaxPresets() };
  }

  @Post('payroll-tax-presets/apply')
  @Permissions('create_sales')
  async applyTaxPreset(
    @Req() req: AuthenticatedRequest,
    @Body() body: { presetId?: string },
  ) {
    if (!body?.presetId) {
      throw new BadRequestException('presetId is required');
    }

    const result = await this.hrService.applyKenyaTaxPreset(
      this.getTenantId(req),
      body.presetId,
    );
    return {
      success: true,
      data: result,
      message: 'Tax preset applied successfully',
    };
  }

  @Get('reports/p10')
  @Permissions('view_sales')
  async getP10(
    @Req() req: AuthenticatedRequest,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const monthNum = Number(month);
    const yearNum = Number(year);
    if (!monthNum || monthNum < 1 || monthNum > 12) {
      throw new BadRequestException('Valid month is required');
    }
    if (!yearNum || yearNum < 1900 || yearNum > 2100) {
      throw new BadRequestException('Valid year is required');
    }

    const report = await this.hrService.buildP10Report(
      this.getTenantId(req),
      monthNum,
      yearNum,
    );
    return { success: true, data: report };
  }

  @Get('reports/p9')
  @Permissions('view_sales')
  async getP9(@Req() req: AuthenticatedRequest, @Query('year') year: string) {
    const yearNum = Number(year);
    if (!yearNum || yearNum < 1900 || yearNum > 2100) {
      throw new BadRequestException('Valid year is required');
    }

    const report = await this.hrService.buildP9Report(
      this.getTenantId(req),
      yearNum,
    );
    return { success: true, data: report };
  }

  @Get('payslip')
  @Permissions('view_sales')
  async getPayslip(
    @Req() req: AuthenticatedRequest,
    @Query('runId') runId?: string,
    @Query('salarySchemeId') salarySchemeId?: string,
    @Query('employeeName') employeeName?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    if (!salarySchemeId && !employeeName) {
      throw new BadRequestException(
        'salarySchemeId or employeeName is required',
      );
    }

    const effectiveBranchId = this.resolveBranchScope(req);
    const payslip = await this.hrService.generatePayslip(
      this.getTenantId(req),
      {
        runId,
        salarySchemeId,
        employeeName,
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
        branchId: effectiveBranchId,
      },
    );

    return { success: true, data: payslip };
  }
}
