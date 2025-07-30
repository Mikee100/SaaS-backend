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

  @Get('test')
  async test() {
    console.log('Test endpoint called');
    return { message: 'Sales controller is working' };
  }

  @Get('analytics')
  @Permissions('view_reports')
  async getAnalytics(@Req() req) {
    return this.salesService.getAnalytics(req.user.tenantId);
  }

  @Get(':id/receipt')
  @Permissions('view_sales')
  async getReceipt(@Param('id') id: string, @Req() req) {
    console.log('Receipt endpoint called with ID:', id);
    console.log('User tenant ID:', req.user?.tenantId);
    
    try {
      const sale = await this.salesService.getSaleById(id, req.user?.tenantId);
      console.log('Sale found:', sale);
      
      // Get business info from tenant
      const tenant = await this.salesService.getTenantInfo(req.user?.tenantId);
      console.log('Tenant info:', tenant);
      
      return {
        id: sale.id,
        saleId: sale.id,
        date: sale.createdAt,
        customerName: sale.customerName,
        customerPhone: sale.customerPhone,
        items: sale.items.map(item => ({
          productId: item.productId,
          name: item.product?.name || 'Unknown Product',
          price: item.price,
          quantity: item.quantity
        })),
        total: sale.total,
        paymentMethod: sale.paymentType,
        amountReceived: sale.amountReceived,
        change: sale.change,
        businessInfo: {
          name: tenant?.name || 'Business Name',
          address: tenant?.address,
          phone: tenant?.phone,
          email: tenant?.email
        }
      };
    } catch (error) {
      console.error('Error in getReceipt:', error);
      throw error;
    }
  }

  @Post()
  @Permissions('edit_sales')
  async createSale(@Body() dto: CreateSaleDto & { idempotencyKey: string }, @Req() req) {
    if (!dto.idempotencyKey) throw new Error('Missing idempotency key');
    // Attach tenantId and userId from JWT
    return this.salesService.createSale(dto, req.user.tenantId, req.user.id);
    
  }

  @Get()
  @Permissions('view_sales')
  async listSales(@Req() req) {
    return this.salesService.listSales(req.user.tenantId);
  }

  @Get(':id')
  @Permissions('view_sales')
  async getSaleById(@Param('id') id: string, @Req() req) {
    // Optionally: check tenant/user permissions
    return this.salesService.getSaleById(id, req.user?.tenantId);
  }
} 