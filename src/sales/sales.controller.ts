import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './create-sale.dto';
import { AuthGuard } from '@nestjs/passport';
import { NotFoundException } from '@nestjs/common';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TrialGuard } from '../auth/trial.guard';
import {
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';

@UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
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
  async getReceipt(
    @Param('id') id: string,
    @Query('type') type: string,
    @Req() req,
  ) {
    const requestId = Math.random().toString(36).substring(2, 9);
    const logContext = {
      requestId,
      saleId: id,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
    };

    try {
      if (!id) {
        throw new BadRequestException('Sale ID is required');
      }
      if (!req.user?.tenantId) {
        throw new UnauthorizedException('Invalid user context');
      }

      const receiptType = type === 'merchant' ? 'merchant' : 'customer';
      return await this.salesService.getReceipt(
        id,
        req.user.tenantId,
        receiptType,
      );
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      console.error('Error generating receipt', { ...logContext, error: error.message });
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
  // NOTE: Using `any` for the body here to bypass strict DTO validation,
  // because the POS client may send fields that don't match `CreateSaleDto` exactly.
  // The `SalesService.createSale` method still performs its own business validation.
  async create(@Body() createSaleDto: any, @Req() req) {
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
      // Log the full error details for debugging
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      // Re-throw known exceptions as-is
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      // For unknown errors, include the actual error message
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Failed to create sale'
      );
    }
  }

  @Get()
  @Permissions('view_sales')
  async listSales(@Req() req) {
    const branchId = req.headers['x-branch-id'] as string;
    return this.salesService.listSales(req.user.tenantId, branchId);
  }

  @Get(':id')
  @Permissions('view_sales')
  async getSaleById(@Param('id') id: string, @Req() req) {
    // Optionally: check tenant/user permissions
    return this.salesService.getSaleById(id, req.user?.tenantId);
  }

  // Credit management endpoints
  @Get('credits/all')
  @Permissions('view_sales')
  async getCredits(@Req() req) {
    return this.salesService.getCredits(req.user.tenantId);
  }

  @Get('credits/:id')
  @Permissions('view_sales')
  async getCreditById(@Param('id') id: string, @Req() req) {
    return this.salesService.getCreditById(id, req.user.tenantId);
  }

  @Post('credits/:id/payment')
  @Permissions('create_sales')
  async makeCreditPayment(
    @Param('id') creditId: string,
    @Body() body: { amount: number; paymentMethod: string; notes?: string },
    @Req() req,
  ) {
    return this.salesService.makeCreditPayment(
      creditId,
      body.amount,
      body.paymentMethod,
      req.user.tenantId,
      body.notes,
    );
  }

  @Get('credits/score')
  @Permissions('view_sales')
  async getCreditScore(@Req() req) {
    const { customerName, customerPhone } = req.query;
    console.log('getCreditScore called with:', {
      customerName,
      customerPhone,
      tenantId: req.user.tenantId,
    });
    try {
      const result = await this.salesService.calculateCustomerCreditScore(
        req.user.tenantId,
        customerName as string,
        customerPhone as string,
      );
      console.log('getCreditScore result:', result);
      return result;
    } catch (error) {
      console.error('getCreditScore error:', error);
      throw error;
    }
  }

  @Post('credits/eligibility')
  @Permissions('view_sales')
  async checkCreditEligibility(
    @Body()
    body: {
      customerName: string;
      customerPhone?: string;
      requestedAmount: number;
    },
    @Req() req,
  ) {
    console.log('checkCreditEligibility called with:', {
      body,
      tenantId: req.user.tenantId,
    });
    try {
      const result = await this.salesService.checkCreditEligibility(
        req.user.tenantId,
        body.customerName,
        body.requestedAmount,
        body.customerPhone,
      );
      console.log('checkCreditEligibility result:', result);
      return result;
    } catch (error) {
      console.error('checkCreditEligibility error:', error);
      throw error;
    }
  }

  @Get('credits/analytics')
  @Permissions('view_sales')
  async getCreditAnalytics(@Req() req) {
    const { startDate, endDate } = req.query;
    console.log('getCreditAnalytics called with:', {
      tenantId: req.user.tenantId,
      startDate,
      endDate,
    });
    try {
      const result = await this.salesService.getCreditAnalytics(
        req.user.tenantId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
      );
      console.log('getCreditAnalytics result:', result);
      return result;
    } catch (error) {
      console.error('getCreditAnalytics error:', error);
      throw error;
    }
  }

  @Get('credits/customer-history')
  @Permissions('view_sales')
  async getCustomerCreditHistory(@Req() req) {
    const { customerName, customerPhone } = req.query;
    console.log('getCustomerCreditHistory called with:', {
      tenantId: req.user.tenantId,
      customerName,
      customerPhone,
    });
    try {
      const result = await this.salesService.getCustomerCreditHistory(
        req.user.tenantId,
        customerName as string,
        customerPhone as string,
      );
      console.log('getCustomerCreditHistory result:', result);
      return result;
    } catch (error) {
      console.error('getCustomerCreditHistory error:', error);
      throw error;
    }
  }

  @Get('credits/aging')
  @Permissions('view_sales')
  async getCreditAgingAnalysis(@Req() req) {
    console.log('getCreditAgingAnalysis called with:', {
      tenantId: req.user.tenantId,
    });
    try {
      const result = await this.salesService.getCreditAgingAnalysis(
        req.user.tenantId,
      );
      console.log('getCreditAgingAnalysis result:', result);
      return result;
    } catch (error) {
      console.error('getCreditAgingAnalysis error:', error);
      throw error;
    }
  }
}
