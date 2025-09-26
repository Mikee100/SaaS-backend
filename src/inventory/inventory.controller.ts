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

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Permissions('view_inventory')
  async findAll(@Req() req) {
    const tenantId = req.user.tenantId;
    const branchId = req.query.branchId as string | undefined;
    if (branchId) {
      return this.inventoryService.findAllByBranch(tenantId, branchId);
    }
    return this.inventoryService.findAllByTenant(tenantId);
  }

  @Post()
  @Permissions('create_inventory')
  async create(@Req() req, @Body() dto: CreateInventoryDto) {
    const tenantId = req.user.tenantId;
    // branchId can be passed in body (dto)
    return this.inventoryService.createInventory(
      dto,
      tenantId,
      req.user.userId,
      req.ip,
    );
  }

  @Put(':id')
  @Permissions('edit_inventory')
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateInventoryDto,
  ) {
    const tenantId = req.user.tenantId;
    // branchId can be passed in body (dto)
    return this.inventoryService.updateInventory(
      id,
      dto,
      tenantId,
      req.user.userId,
      req.ip,
    );
  }

  @Delete(':id')
  @Permissions('delete_inventory')
  async remove(@Req() req, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.inventoryService.deleteInventory(
      id,
      tenantId,
      req.user.userId,
      req.ip,
    );
  }
}
