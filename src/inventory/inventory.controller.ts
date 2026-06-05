import {
  Controller,
  Get,
  Req,
  UseGuards,
  Body,
  Param,
  Post,
  Put,
  Delete,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateInventoryDto } from './create-inventory.dto';
import { UpdateInventoryDto } from './update-inventory.dto';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TrialGuard } from '../auth/trial.guard';
import { RequireModules } from '../auth/module-access.decorator';
import { AuthenticatedRequest } from '../auth/request.types';
import { BadRequestException } from '@nestjs/common';

type InventoryMovementInput = {
  productId: string;
  type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  reason?: string;
  location: string;
  destinationLocation?: string;
  branchId?: string;
};

@UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
@RequireModules('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

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

  private getBranchId(req: AuthenticatedRequest): string | undefined {
    const headerBranchId = req.headers['x-branch-id'];
    if (typeof headerBranchId === 'string' && headerBranchId.trim()) {
      return headerBranchId;
    }
    return req.user?.branchId;
  }

  @Get()
  @Permissions('view_inventory')
  async findAll(@Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    const branchId = this.getBranchId(req);
    if (branchId) {
      return this.inventoryService.findAllByBranch(tenantId, branchId);
    }
    return this.inventoryService.findAllByTenant(tenantId);
  }

  @Get('advanced')
  @Permissions('view_inventory')
  async findAdvanced(@Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    const branchId = this.getBranchId(req);
    return this.inventoryService.findAdvanced(tenantId, branchId);
  }

  @Get('movements')
  @Permissions('view_inventory')
  async getMovements(@Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    const branchId = this.getBranchId(req);
    return this.inventoryService.getMovements(tenantId, branchId);
  }

  @Get('alerts')
  @Permissions('view_inventory')
  async getAlerts(@Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    const branchId = this.getBranchId(req);
    return this.inventoryService.getAlerts(tenantId, branchId);
  }

  @Get('locations')
  @Permissions('view_inventory')
  async getLocations(@Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    const branchId = this.getBranchId(req);
    return this.inventoryService.getLocations(tenantId, branchId);
  }

  @Get('forecast')
  @Permissions('view_inventory')
  async getForecast(@Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    const branchId = this.getBranchId(req);
    return this.inventoryService.getForecast(tenantId, branchId);
  }

  @Post('movements')
  @Permissions('edit_inventory')
  async createMovement(
    @Req() req: AuthenticatedRequest,
    @Body() dto: InventoryMovementInput,
  ) {
    const tenantId = this.getTenantId(req);
    return this.inventoryService.createMovement(
      dto,
      tenantId,
      this.getUserId(req),
      req.ip,
    );
  }

  @Post()
  @Permissions('create_inventory')
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateInventoryDto,
  ) {
    const tenantId = this.getTenantId(req);
    // branchId can be passed in body (dto)
    const inventory = (await this.inventoryService.createInventory(
      dto,
      tenantId,
      this.getUserId(req),
      req.ip,
    )) as unknown;
    return inventory;
  }

  @Put(':id')
  @Permissions('edit_inventory')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateInventoryDto,
  ) {
    const tenantId = this.getTenantId(req);
    // branchId can be passed in body (dto)
    return this.inventoryService.updateInventory(
      id,
      dto,
      tenantId,
      this.getUserId(req),
      req.ip,
    );
  }

  @Delete(':id')
  @Permissions('delete_inventory')
  async remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const tenantId = this.getTenantId(req);
    return this.inventoryService.deleteInventory(
      id,
      tenantId,
      this.getUserId(req),
      req.ip,
    );
  }
}
