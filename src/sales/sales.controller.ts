import { Controller, Post, Body, Req, UseGuards, Get, Param } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './create-sale.dto';
import { AuthGuard } from '@nestjs/passport';
import { NotFoundException } from '@nestjs/common';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { BadRequestException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';

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
    const requestId = Math.random().toString(36).substring(2, 9);
    const logContext = { requestId, saleId: id, userId: req.user?.id, tenantId: req.user?.tenantId };
    
    console.log('Receipt request received:', { ...logContext });
    
    try {
      if (!id) {
        console.error('Missing sale ID in request', logContext);
        throw new BadRequestException('Sale ID is required');
      }

      if (!req.user?.tenantId) {
        console.error('Missing tenant ID in user context', logContext);
        throw new UnauthorizedException('Invalid user context');
      }

      console.log('Fetching sale details...', logContext);
      const sale = await this.salesService.getSaleById(id, req.user.tenantId);
      
      if (!sale) {
        console.error('Sale not found', logContext);
        throw new NotFoundException('Sale not found');
      }

      console.log('Fetching tenant info...', { ...logContext, saleId: sale.id });
      const tenant = await this.salesService.getTenantInfo(req.user.tenantId);
      
      if (!tenant) {
        console.error('Tenant not found', logContext);
        throw new NotFoundException('Business information not found');
      }

      // Transform the response to match the expected format
      const response = {
        id: sale.id,
        saleId: sale.id,
        date: sale.createdAt,
        customerName: sale.customerName || 'Walk-in Customer',
        customerPhone: sale.customerPhone || 'N/A',
        items: sale.items.map(item => ({
          productId: item.productId,
          name: item.name || 'Unknown Product',
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity
        })),
        subtotal: sale.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        total: sale.total,
        vatAmount: sale.vatAmount || 0,
        paymentMethod: sale.paymentType,
        amountReceived: sale.total, // Assuming full payment for now
        change: 0, // Assuming no change for now
        businessInfo: {
          name: tenant.name || 'Business Name',
          address: tenant.address || 'N/A',
          phone: tenant.contactPhone || 'N/A',
          email: tenant.contactEmail || 'N/A',
          // vatNumber: tenant.vatNumber || 'N/A',
          // receiptFooter: tenant.receiptFooter || 'Thank you for your business!'
        },
        mpesaTransaction: sale.mpesaTransactions?.[0] ? {
          phoneNumber: sale.mpesaTransactions[0].phoneNumber,
          amount: sale.mpesaTransactions[0].amount,
          status: sale.mpesaTransactions[0].status,
          mpesaReceipt: sale.mpesaTransactions[0].transactionId,
          message: sale.mpesaTransactions[0].responseDesc || '',
          transactionDate: sale.mpesaTransactions[0].createdAt,
        } : null,
      };

      console.log('Receipt generated successfully', { ...logContext, saleId: sale.id });
      return response;
      
    } catch (error) {
      console.error('Error generating receipt:', {
        ...logContext,
        error: error.message,
        stack: error.stack,
        errorName: error.name,
        errorCode: error.status || error.statusCode || 500,
      });

      // Re-throw with appropriate status code
      if (error instanceof BadRequestException || 
          error instanceof UnauthorizedException || 
          error instanceof NotFoundException) {
        throw error;
      }
      
      // For unexpected errors, return a 500 with a generic message
      throw new InternalServerErrorException('Failed to generate receipt. Please try again later.');
    }
  }

  @Get('recent')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('view_sales')
  async getRecentSales(@Req() req) {
    const requestId = Math.random().toString(36).substring(2, 9);
    const logContext = { 
      requestId, 
      userId: req.user?.id, 
      tenantId: req.user?.tenantId 
    };
    
    console.log('Recent sales request received:', { ...logContext });
    
    try {
      if (!req.user?.tenantId) {
        console.error('Missing tenant ID in user context', logContext);
        throw new UnauthorizedException('Invalid user context');
      }

      console.log('Fetching recent sales...', logContext);
      const recentSales = await this.salesService.getRecentSales(req.user.tenantId, 10);
      
      console.log(`Found ${recentSales.length} recent sales`, { 
        ...logContext, 
        salesCount: recentSales.length 
      });
      
      return recentSales;
    } catch (error) {
      console.error('Error fetching recent sales:', {
        ...logContext,
        error: error.message,
        stack: error.stack,
        errorName: error.name,
      });

      // Return an empty array instead of throwing to prevent frontend errors
      return [];
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