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
} from '@nestjs/common';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('salary-schemes')
export class SalaryController {
  constructor(private readonly salaryService: SalaryService) {}

  @Post()
  @Permissions('create_sales')
  async createSalaryScheme(@Body() createSalarySchemeDto: any, @Req() req) {
    if (!req.user?.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    try {
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

  @Get()
  @Permissions('view_sales')
  async getSalarySchemes(@Req() req, @Query() query: any) {
    const branchId = req.headers['x-branch-id'] as string;
    const result = await this.salaryService.getSalarySchemes(req.user.tenantId, branchId, query);
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
    return this.salaryService.getSalaryAnalytics(
      req.user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('current-month-total')
  @Permissions('view_sales')
  async getCurrentMonthSalaryTotal(@Req() req) {
    const result = await this.salaryService.getCurrentMonthSalaryTotal(req.user.tenantId);
    return {
      success: true,
      data: result,
    };
  }

  @Get('total-expense')
  @Permissions('view_sales')
  async getSalaryTotalForMonth(@Req() req, @Query('month') month: number, @Query('year') year: number) {
    console.log(`Controller: getSalaryTotalForMonth called with month: ${month}, year: ${year}, tenantId: ${req.user.tenantId}`);
    if (!month || !year || month < 1 || month > 12 || year < 1900 || year > 2100) {
      throw new BadRequestException('Valid month (1-12) and year (1900-2100) are required');
    }
    const result = await this.salaryService.getSalaryTotalForMonth(req.user.tenantId, month, year);
    console.log(`Controller: returning result:`, result);
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
    const branchId = req.headers['x-branch-id'] as string;
    const result = await this.salaryService.getSalarySchemesByMonth(req.user.tenantId, parseInt(month), parseInt(year), branchId, query);
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
    return this.salaryService.getSalarySchemeById(id, req.user.tenantId);
  }

  @Put(':id')
  @Permissions('create_sales')
  async updateSalaryScheme(
    @Param('id') id: string,
    @Body() updateSalarySchemeDto: any,
    @Req() req,
  ) {
    return this.salaryService.updateSalaryScheme(
      id,
      updateSalarySchemeDto,
      req.user.tenantId,
    );
  }

  @Delete(':id')
  @Permissions('create_sales')
  async deleteSalaryScheme(@Param('id') id: string, @Req() req) {
    return this.salaryService.deleteSalaryScheme(id, req.user.tenantId);
  }
}
