import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Param,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './create-sale.dto';
import { AuthGuard } from '@nestjs/passport';
import { NotFoundException } from '@nestjs/common';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import {
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';

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
        sales: sales.slice(0, 5), // Return first 5 sales
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
    const logContext = {
      requestId,
      saleId: id,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
    };

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

      console.log('Fetching tenant info...', {
        ...logContext,
        saleId: sale.id,
      });
      const tenant = await this.salesService.getTenantInfo(req.user.tenantId);

      if (!tenant) {
        console.error('Tenant not found', logContext);
        throw new NotFoundException('Business information not found');
      }

      // Include branch information in the response
      const response = {
        id: sale.id,
        saleId: sale.id,
        date: sale.createdAt,
        customerName: sale.customerName || 'Walk-in Customer',
        customerPhone: sale.customerPhone || 'N/A',
        items: sale.items.map((item) => ({
          productId: item.productId,
          name: item.product?.name || 'Unknown Product',
          price: item.price,
          quantity: item.quantity,
        })),
        total: sale.total,
        paymentMethod: sale.paymentType,
        amountReceived: sale.paymentType === 'cash' ? sale.total : sale.total, // amountReceived is now the same as total for cash payments
        change: 0, // Change is now always 0 since we don't track amount received separately
        businessInfo: {
          name: tenant.name,
          address: tenant.address,
          phone: tenant.contactPhone,
          email: tenant.contactEmail,
        },
        branch: sale.Branch
          ? {
              id: sale.Branch.id,
              name: sale.Branch.name,
              address: sale.Branch.address || '',
            }
          : null,
      };

      console.log('Sending receipt response', {
        ...logContext,
        saleId: response.id,
      });
      return response;
    } catch (error) {
      console.error('Error generating receipt:', {
        ...logContext,
        error: error.message,
      });
      throw new InternalServerErrorException('Failed to generate receipt');
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
      tenantId: req.user?.tenantId,
    };

    console.log('Recent sales request received:', { ...logContext });

    try {
      if (!req.user?.tenantId) {
        console.error('Missing tenant ID in user context', logContext);
        throw new UnauthorizedException('Invalid user context');
      }

      console.log('Fetching recent sales...', logContext);
      const recentSales = await this.salesService.getRecentSales(
        req.user.tenantId,
        10,
      );

      console.log(`Found ${recentSales.length} recent sales`, {
        ...logContext,
        salesCount: recentSales.length,
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
  async create(@Body() createSaleDto: CreateSaleDto, @Req() req) {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    if (!req.user.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    // Add branch ID from the request body or from the user's default branch
    const branchId = createSaleDto.branchId || req.user.branchId;

    const saleData = {
      ...createSaleDto,
      branchId, // Include the branch ID in the sale data
    };

    try {
      const sale = await this.salesService.createSale(
        saleData,
        req.user.tenantId,
        req.user.userId,
      );

      return {
        success: true,
        data: sale,
        message: 'Sale created successfully',
      };
    } catch (error) {
      console.error('Error creating sale:', error);
      throw new InternalServerErrorException('Failed to create sale');
    }
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
