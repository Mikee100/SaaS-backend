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
import { HrService } from './hr.service';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequireModules('payroll')
@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) {}

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
  async listEmployees(@Req() req, @Query('branchId') branchId?: string, @Query('search') search?: string) {
    const employees = await this.hrService.listEmployees(req.user.tenantId, branchId, search);
    return { success: true, data: employees };
  }

  @Post('employees')
  @Permissions('create_sales')
  async createEmployee(@Req() req, @Body() body: any) {
    const employee = await this.hrService.createEmployee(req.user.tenantId, body || {});
    return { success: true, data: employee, message: 'Employee profile created' };
  }

  @Put('employees/:id')
  @Permissions('create_sales')
  async updateEmployee(@Req() req, @Param('id') id: string, @Body() body: any) {
    const employee = await this.hrService.updateEmployee(req.user.tenantId, id, body || {});
    return { success: true, data: employee, message: 'Employee profile updated' };
  }

  @Delete('employees/:id')
  @Permissions('create_sales')
  async deleteEmployee(@Req() req, @Param('id') id: string) {
    await this.hrService.deleteEmployee(req.user.tenantId, id);
    return { success: true, message: 'Employee profile deleted' };
  }

  @Get('payroll-templates')
  @Permissions('view_sales')
  async listTemplates(@Req() req, @Query('active') active?: string) {
    const onlyActive = active === '1' || active === 'true';
    const templates = await this.hrService.listPayrollTemplates(req.user.tenantId, onlyActive);
    return { success: true, data: templates };
  }

  @Post('payroll-templates')
  @Permissions('create_sales')
  async createTemplate(@Req() req, @Body() body: any) {
    const template = await this.hrService.createPayrollTemplate(req.user.tenantId, body || {});
    return { success: true, data: template, message: 'Payroll template created' };
  }

  @Put('payroll-templates/:id')
  @Permissions('create_sales')
  async updateTemplate(@Req() req, @Param('id') id: string, @Body() body: any) {
    const template = await this.hrService.updatePayrollTemplate(req.user.tenantId, id, body || {});
    return { success: true, data: template, message: 'Payroll template updated' };
  }

  @Delete('payroll-templates/:id')
  @Permissions('create_sales')
  async deleteTemplate(@Req() req, @Param('id') id: string) {
    await this.hrService.deletePayrollTemplate(req.user.tenantId, id);
    return { success: true, message: 'Payroll template deleted' };
  }

  @Get('payroll-runs')
  @Permissions('view_sales')
  async listPayrollRuns(
    @Req() req,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('status') status?: string,
  ) {
    const monthNum = month ? Number(month) : undefined;
    const yearNum = year ? Number(year) : undefined;

    if (month && (!monthNum || monthNum < 1 || monthNum > 12)) {
      throw new BadRequestException('Month must be between 1 and 12');
    }

    if (year && (!yearNum || yearNum < 1900 || yearNum > 2100)) {
      throw new BadRequestException('Year must be between 1900 and 2100');
    }

    const effectiveBranchId = this.resolveBranchScope(req);
    const runs = await this.hrService.listPayrollRuns(
      req.user.tenantId,
      monthNum,
      yearNum,
      effectiveBranchId,
      status,
    );
    return { success: true, data: runs };
  }

  @Get('payroll-runs/:id')
  @Permissions('view_sales')
  async getPayrollRun(@Req() req, @Param('id') id: string) {
    const run = await this.hrService.getPayrollRunById(req.user.tenantId, id);
    return { success: true, data: run };
  }

  @Post('payroll-runs/:id/approve')
  @Permissions('create_sales')
  async approvePayrollRun(@Req() req, @Param('id') id: string) {
    const run = await this.hrService.approvePayrollRun(req.user.tenantId, id, req.user.userId);
    return { success: true, data: run, message: 'Payroll run approved' };
  }

  @Post('payroll-runs/:id/cancel')
  @Permissions('create_sales')
  async cancelPayrollRun(@Req() req, @Param('id') id: string, @Body() body: any) {
    const run = await this.hrService.cancelPayrollRun(
      req.user.tenantId,
      id,
      req.user.userId,
      body?.reason,
    );
    return { success: true, data: run, message: 'Payroll draft cancelled' };
  }

  @Post('payroll-runs/:id/reverse')
  @Permissions('create_sales')
  async reversePayrollRun() {
    throw new BadRequestException(
      'Use POST /salary-schemes/payroll-runs/:id/reverse for financial reversal',
    );
  }

  @Get('payroll-period-locks')
  @Permissions('view_sales')
  async getPayrollPeriodLocks(@Req() req) {
    const locks = await this.hrService.listPayrollPeriodLocks(req.user.tenantId);
    return { success: true, data: locks };
  }

  @Post('payroll-period-locks')
  @Permissions('create_sales')
  async lockPayrollPeriod(@Req() req, @Body() body: any) {
    const month = Number(body?.month);
    const year = Number(body?.year);
    if (!month || month < 1 || month > 12 || !year || year < 1900 || year > 2100) {
      throw new BadRequestException('Valid month and year are required');
    }

    const lock = await this.hrService.lockPayrollPeriod(req.user.tenantId, {
      month,
      year,
      branchId: body?.branchId,
      reason: body?.reason,
      lockedBy: req.user.userId,
    });

    return { success: true, data: lock, message: 'Payroll period locked' };
  }

  @Delete('payroll-period-locks')
  @Permissions('create_sales')
  async unlockPayrollPeriod(@Req() req, @Body() body: any) {
    const month = Number(body?.month);
    const year = Number(body?.year);
    if (!month || month < 1 || month > 12 || !year || year < 1900 || year > 2100) {
      throw new BadRequestException('Valid month and year are required');
    }

    await this.hrService.unlockPayrollPeriod(req.user.tenantId, {
      month,
      year,
      branchId: body?.branchId,
    });

    return { success: true, message: 'Payroll period unlocked' };
  }

  @Post('payroll-period-locks/unlock')
  @Permissions('create_sales')
  async unlockPayrollPeriodPost(@Req() req, @Body() body: any) {
    const month = Number(body?.month);
    const year = Number(body?.year);
    if (!month || month < 1 || month > 12 || !year || year < 1900 || year > 2100) {
      throw new BadRequestException('Valid month and year are required');
    }

    await this.hrService.unlockPayrollPeriod(req.user.tenantId, {
      month,
      year,
      branchId: body?.branchId,
    });

    return { success: true, message: 'Payroll period unlocked' };
  }

  @Get('payroll-settings')
  @Permissions('view_sales')
  async getPayrollSettings(@Req() req) {
    const settings = await this.hrService.getPayrollSettings(req.user.tenantId);
    return { success: true, data: settings };
  }

  @Put('payroll-settings')
  @Permissions('create_sales')
  async updatePayrollSettings(@Req() req, @Body() body: any) {
    const settings = await this.hrService.updatePayrollSettings(req.user.tenantId, body || {});
    return { success: true, data: settings, message: 'Payroll settings updated' };
  }

  @Get('payroll-tax-presets')
  @Permissions('view_sales')
  async getTaxPresets() {
    return { success: true, data: this.hrService.listKenyaTaxPresets() };
  }

  @Post('payroll-tax-presets/apply')
  @Permissions('create_sales')
  async applyTaxPreset(@Req() req, @Body() body: any) {
    if (!body?.presetId) {
      throw new BadRequestException('presetId is required');
    }

    const result = await this.hrService.applyKenyaTaxPreset(req.user.tenantId, body.presetId);
    return { success: true, data: result, message: 'Tax preset applied successfully' };
  }

  @Get('reports/p10')
  @Permissions('view_sales')
  async getP10(@Req() req, @Query('month') month: string, @Query('year') year: string) {
    const monthNum = Number(month);
    const yearNum = Number(year);
    if (!monthNum || monthNum < 1 || monthNum > 12) {
      throw new BadRequestException('Valid month is required');
    }
    if (!yearNum || yearNum < 1900 || yearNum > 2100) {
      throw new BadRequestException('Valid year is required');
    }

    const report = await this.hrService.buildP10Report(req.user.tenantId, monthNum, yearNum);
    return { success: true, data: report };
  }

  @Get('reports/p9')
  @Permissions('view_sales')
  async getP9(@Req() req, @Query('year') year: string) {
    const yearNum = Number(year);
    if (!yearNum || yearNum < 1900 || yearNum > 2100) {
      throw new BadRequestException('Valid year is required');
    }

    const report = await this.hrService.buildP9Report(req.user.tenantId, yearNum);
    return { success: true, data: report };
  }

  @Get('payslip')
  @Permissions('view_sales')
  async getPayslip(
    @Req() req,
    @Query('runId') runId?: string,
    @Query('salarySchemeId') salarySchemeId?: string,
    @Query('employeeName') employeeName?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    if (!salarySchemeId && !employeeName) {
      throw new BadRequestException('salarySchemeId or employeeName is required');
    }

    const payslip = await this.hrService.generatePayslip(req.user.tenantId, {
      runId,
      salarySchemeId,
      employeeName,
      month: month ? Number(month) : undefined,
      year: year ? Number(year) : undefined,
    });

    return { success: true, data: payslip };
  }
}
