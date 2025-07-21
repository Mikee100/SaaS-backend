import { Controller, Post, Body, Req, UseGuards, Get, Param } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './create-sale.dto';
import { AuthGuard } from '@nestjs/passport';
import { NotFoundException } from '@nestjs/common';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @Permissions('edit_sales')
  async createSale(@Body() dto: CreateSaleDto & { idempotencyKey: string }, @Req() req) {
    if (!dto.idempotencyKey) throw new Error('Missing idempotency key');
    // Attach tenantId and userId from JWT
    return this.salesService.createSale(dto, req.user.tenantId, req.user.userId);
  }

  @Get()
  @Permissions('view_sales')
  async listSales(@Req() req) {
    return this.salesService.listSales(req.user.tenantId);
  }

  @Get('analytics')
  @Permissions('view_reports')
  async getAnalytics(@Req() req) {
    return this.salesService.getAnalytics(req.user.tenantId);
  }

  @Get(':id')
  @Permissions('view_sales')
  async getSaleById(@Param('id') id: string, @Req() req) {
    // Optionally: check tenant/user permissions
    return this.salesService.getSaleById(id, req.user?.tenantId);
  }
} 