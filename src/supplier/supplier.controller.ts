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

@UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
@Controller('suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Get()
  @Permissions('view_inventory')
  async findAll(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.supplierService.findAll(tenantId);
  }

  @Get('stats')
  @Permissions('view_inventory')
  async getStats(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.supplierService.getSupplierStats(tenantId);
  }

  @Get(':id')
  @Permissions('view_inventory')
  async findOne(@Param('id') id: string, @Req() req) {
    const tenantId = req.user.tenantId;
    return this.supplierService.findOne(id, tenantId);
  }

  @Post()
  @Permissions('create_inventory')
  async create(@Body() data: any, @Req() req) {
    const tenantId = req.user.tenantId;
    return this.supplierService.create(data, tenantId, req.user.userId, req.ip);
  }

  @Put(':id')
  @Permissions('edit_inventory')
  async update(@Param('id') id: string, @Body() data: any, @Req() req) {
    const tenantId = req.user.tenantId;
    return this.supplierService.update(
      id,
      data,
      tenantId,
      req.user.userId,
      req.ip,
    );
  }

  @Delete(':id')
  @Permissions('delete_inventory')
  async remove(@Param('id') id: string, @Req() req) {
    const tenantId = req.user.tenantId;
    return this.supplierService.remove(id, tenantId, req.user.userId, req.ip);
  }
}
