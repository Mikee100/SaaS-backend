import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TrialGuard } from '../auth/trial.guard';
import { AuthenticatedRequest } from '../auth/request.types';

const getActorUserId = (req: AuthenticatedRequest): string | undefined =>
  req.user.userId ?? req.user.sub;

@UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
@Controller('suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Get()
  @Permissions('view_suppliers')
  async findAll(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new Error('Tenant context is required');
    }
    return this.supplierService.findAll(tenantId);
  }

  @Get('stats')
  @Permissions('view_suppliers')
  async getStats(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new Error('Tenant context is required');
    }
    return this.supplierService.getSupplierStats(tenantId);
  }

  @Get('deleted')
  @Permissions('view_suppliers')
  async findDeleted(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new Error('Tenant context is required');
    }
    return this.supplierService.getDeletedSuppliers(tenantId);
  }

  @Get(':id')
  @Permissions('view_suppliers')
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new Error('Tenant context is required');
    }
    return this.supplierService.findOne(id, tenantId);
  }

  @Post()
  @Permissions('manage_suppliers')
  async create(
    @Body() data: Record<string, unknown>,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = req.user.tenantId;
    const actorUserId = getActorUserId(req);
    if (!tenantId || !actorUserId) {
      throw new Error('Missing authenticated user context');
    }
    return this.supplierService.create(data, tenantId, actorUserId, req.ip);
  }

  @Put(':id')
  @Permissions('manage_suppliers')
  async update(
    @Param('id') id: string,
    @Body() data: Record<string, unknown>,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = req.user.tenantId;
    const actorUserId = getActorUserId(req);
    if (!tenantId || !actorUserId) {
      throw new Error('Missing authenticated user context');
    }
    return this.supplierService.update(id, data, tenantId, actorUserId, req.ip);
  }

  @Post(':id/restore')
  @Permissions('manage_suppliers')
  async restore(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    const actorUserId = getActorUserId(req);
    if (!tenantId || !actorUserId) {
      throw new Error('Missing authenticated user context');
    }
    return this.supplierService.restoreSupplier(
      id,
      tenantId,
      actorUserId,
      req.ip,
    );
  }

  @Delete(':id')
  @Permissions('manage_suppliers')
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    const actorUserId = getActorUserId(req);
    if (!tenantId || !actorUserId) {
      throw new Error('Missing authenticated user context');
    }
    return this.supplierService.remove(id, tenantId, actorUserId, req.ip);
  }
}
