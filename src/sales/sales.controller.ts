import { Controller, Post, Body, Req, UseGuards, Get, Param } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './create-sale.dto';
import { AuthGuard } from '@nestjs/passport';
import { NotFoundException } from '@nestjs/common';

@UseGuards(AuthGuard('jwt'))
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  async createSale(@Body() dto: CreateSaleDto & { idempotencyKey: string }, @Req() req) {
    if (!dto.idempotencyKey) throw new Error('Missing idempotency key');
    // Attach tenantId and userId from JWT
    return this.salesService.createSale(dto, req.user.tenantId, req.user.userId);
  }

  @Get()
  async listSales(@Req() req) {
    return this.salesService.listSales(req.user.tenantId);
  }

  @Get('analytics')
  async getAnalytics(@Req() req) {
    // Call a new service method to get analytics for the tenant
    return this.salesService.getAnalytics(req.user.tenantId);
  }

  @Get(':id')
  async getSaleById(@Param('id') id: string, @Req() req) {
    // Optionally: check tenant/user permissions
    return this.salesService.getSaleById(id, req.user?.tenantId);
  }
} 