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

  @Get('test-sale/:id')
  async testSale(@Param('id') id: string) {
    console.log('Testing sale with ID:', id);
    try {
      const sale = await this.salesService.getSaleById(id, 'test-tenant-id');
      return { message: 'Sale found', sale };
    } catch (error) {
      return { message: 'Sale not found', error: error.message };
    }
  }

  @Get('test-db')
  async testDb() {
    console.log('Testing database connection');
    try {
      // Try to get all sales
      const sales = await this.salesService.listSales('test-tenant-id');
      return { 
        message: 'Database connected', 
        salesCount: sales.length,
        sales: sales.slice(0, 5) // Return first 5 sales
      };
    } catch (error) {
      return { message: 'Database error', error: error.message };
    }
  }

  @Get('analytics')
  @Permissions('view_reports')
  async getAnalytics(@Req() req) {
    return this.salesService.getAnalytics(req.user.tenantId);
  }

  @Get(':id/receipt')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
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
        id: sale.saleId,
        saleId: sale.saleId,
        date: sale.date,
        customerName: sale.customerName,
        customerPhone: sale.customerPhone,
        items: sale.items.map(item => ({
          productId: item.productId,
          name: item.name || 'Unknown Product',
          price: item.price,
          quantity: item.quantity
        })),
        total: sale.total,
        paymentMethod: sale.paymentType,
        amountReceived: sale.total, // Use total as amountReceived for now
        change: 0, // Set change to 0 for now
        businessInfo: {
          name: tenant?.name || 'Business Name',
          address: tenant?.address,
          phone: tenant?.contactPhone,
          email: tenant?.contactEmail
        }
      };
    } catch (error) {
      console.error('Error in getReceipt:', error);
      throw error;
    }
  }

  @Post()
  @Permissions('create_sales')
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