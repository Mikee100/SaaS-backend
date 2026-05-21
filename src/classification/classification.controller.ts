import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ParseBoolPipe,
} from '@nestjs/common';
import { ClassificationService } from './classification.service';
import { AuthGuard } from '@nestjs/passport';
import {
  CreateClassificationDto,
  UpdateClassificationDto,
  CreateMeasurementUnitDto,
  UpdateMeasurementUnitDto,
} from './dto/classification.dto';

@Controller()
export class ClassificationController {
  constructor(private readonly classificationService: ClassificationService) {}

  // ─── Public: used during tenant creation wizard ────────────────────────────

  /** GET /classifications/public — list all active classifications with units */
  @Get('classifications/public')
  async listPublic() {
    return this.classificationService.findAllClassifications(false);
  }

  // ─── Tenant context: used by frontend/POS for the logged-in tenant ─────────

  /** GET /tenant/classification — returns current tenant's classification + units */
  @Get('tenant/classification')
  @UseGuards(AuthGuard('jwt'))
  async getTenantClassification(@Req() req: any) {
    return this.classificationService.getTenantClassification(req.user.tenantId);
  }

  /** POST /tenant/classification — assign/update classification for tenant */
  @Post('tenant/classification')
  @UseGuards(AuthGuard('jwt'))
  async assignTenantClassification(
    @Req() req: any,
    @Body()
    body: {
      classificationId: string;
      secondaryClassificationId?: string;
      measurementPreferences?: Record<string, any>;
    },
  ) {
    return this.classificationService.assignTenantClassification(
      req.user.tenantId,
      body.classificationId,
      body.secondaryClassificationId,
      body.measurementPreferences,
    );
  }

  // ─── Superadmin: full CRUD ──────────────────────────────────────────────────

  /** GET /admin/classifications */
  @Get('admin/classifications')
  @UseGuards(AuthGuard('jwt'))
  async listAll(@Query('includeInactive') includeInactive?: string) {
    return this.classificationService.findAllClassifications(includeInactive === 'true');
  }

  /** GET /admin/classifications/:id */
  @Get('admin/classifications/:id')
  @UseGuards(AuthGuard('jwt'))
  async getOne(@Param('id') id: string) {
    return this.classificationService.findClassificationById(id);
  }

  /** POST /admin/classifications */
  @Post('admin/classifications')
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() dto: CreateClassificationDto) {
    return this.classificationService.createClassification(dto);
  }

  /** PUT /admin/classifications/:id */
  @Put('admin/classifications/:id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('id') id: string, @Body() dto: UpdateClassificationDto) {
    return this.classificationService.updateClassification(id, dto);
  }

  /** DELETE /admin/classifications/:id */
  @Delete('admin/classifications/:id')
  @UseGuards(AuthGuard('jwt'))
  async delete(@Param('id') id: string) {
    return this.classificationService.deleteClassification(id);
  }

  // ─── Measurement Units ──────────────────────────────────────────────────────

  /** GET /admin/classifications/:id/units */
  @Get('admin/classifications/:id/units')
  @UseGuards(AuthGuard('jwt'))
  async getUnits(@Param('id') id: string) {
    return this.classificationService.findUnitsByClassification(id);
  }

  /** POST /admin/classifications/:id/units */
  @Post('admin/classifications/:id/units')
  @UseGuards(AuthGuard('jwt'))
  async createUnit(@Param('id') id: string, @Body() dto: CreateMeasurementUnitDto) {
    return this.classificationService.createUnit(id, dto);
  }

  /** PUT /admin/classifications/units/:unitId */
  @Put('admin/classifications/units/:unitId')
  @UseGuards(AuthGuard('jwt'))
  async updateUnit(@Param('unitId') unitId: string, @Body() dto: UpdateMeasurementUnitDto) {
    return this.classificationService.updateUnit(unitId, dto);
  }

  /** DELETE /admin/classifications/units/:unitId — soft deactivate */
  @Delete('admin/classifications/units/:unitId')
  @UseGuards(AuthGuard('jwt'))
  async deactivateUnit(@Param('unitId') unitId: string) {
    return this.classificationService.deactivateUnit(unitId);
  }

  // ─── Superadmin assign classification to any tenant ────────────────────────

  /** POST /admin/tenants/:tenantId/classification */
  @Post('admin/tenants/:tenantId/classification')
  @UseGuards(AuthGuard('jwt'))
  async assignForTenant(
    @Param('tenantId') tenantId: string,
    @Body()
    body: {
      classificationId: string;
      secondaryClassificationId?: string;
    },
  ) {
    return this.classificationService.assignTenantClassification(
      tenantId,
      body.classificationId,
      body.secondaryClassificationId,
    );
  }
}
