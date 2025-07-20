import { Controller, Get, Req, UseGuards, Body, Param, Post, Put, Delete } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateInventoryDto } from './create-inventory.dto';
import { UpdateInventoryDto } from './update-inventory.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('inventory')

export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async findAll(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.inventoryService.findAllByTenant(tenantId);
  }

  @Post()
  @Roles('owner', 'manager')
  async create(@Req() req, @Body() dto: CreateInventoryDto) {
    console.log('req.user (POST /inventory):', req.user);
    const tenantId = req.user.tenantId;
    return this.inventoryService.createInventory(dto, tenantId, req.user.userId, req.ip);
  }

  @Put(':id')
  @Roles('owner', 'manager')
  async update(@Req() req, @Param('id') id: string, @Body() dto: UpdateInventoryDto) {
    console.log('req.user (PUT /inventory/:id):', req.user);
    const tenantId = req.user.tenantId;
    return this.inventoryService.updateInventory(id, dto, tenantId, req.user.userId, req.ip);
  }

  @Delete(':id')
  @Roles('owner', 'manager')
  async remove(@Req() req, @Param('id') id: string) {
    console.log('req.user (DELETE /inventory/:id):', req.user);
    const tenantId = req.user.tenantId;
    return this.inventoryService.deleteInventory(id, tenantId, req.user.userId, req.ip);
  }
} 