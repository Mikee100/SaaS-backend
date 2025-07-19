import { Controller, Post, Body, Req, UseGuards, Get } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './create-sale.dto';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  async createSale(@Body() dto: CreateSaleDto, @Req() req) {
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
} 