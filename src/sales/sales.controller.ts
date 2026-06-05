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
import { RequireModules } from '../auth/module-access.decorator';
import {
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthenticatedRequest, AuthenticatedUser } from '../auth/request.types';

type SalesRequest = AuthenticatedRequest;

interface SalesQuery {
  customerName?: string;
  customerPhone?: string;
  startDate?: string;
  endDate?: string;
}

const getActorUserId = (user: AuthenticatedUser): string | undefined =>
  user.userId ?? user.sub;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown error';

const getErrorStack = (error: unknown): string | undefined =>
  error instanceof Error ? error.stack : undefined;

const getErrorName = (error: unknown): string =>
  error instanceof Error ? error.name : 'UnknownError';

const queryString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

@UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
@RequireModules('sales')
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  private getNormalizedRoleNames(user: AuthenticatedUser): string[] {
    if (!Array.isArray(user.roles)) return [];
    return user.roles
      .map((role) =>
        typeof role === 'string'
          ? role.toLowerCase()
          : String(role).toLowerCase(),
      )
      .filter((role): role is string => role.length > 0);
  }

  private resolveSalesBranchScope(req: SalesRequest): string | undefined {
    const roles = this.getNormalizedRoleNames(req.user);
    const assignedBranchId = req.user.branchId;
    const headerBranchId = req.headers['x-branch-id'];
    const requestedBranchId =
      typeof headerBranchId === 'string' ? headerBranchId : undefined;
    const isBranchScopedRole =
      roles.includes('manager') || roles.includes('cashier');

    if (isBranchScopedRole) {
      if (!assignedBranchId) {
        throw new ForbiddenException(
          'Your account is branch-scoped but has no assigned branch. Contact an admin.',
        );
      }

      return assignedBranchId;
    }

    if (requestedBranchId && requestedBranchId !== 'all') {
      return requestedBranchId;
    }

    return undefined;
  }

  @Get('test')
  test() {
    console.log('Test endpoint called');
    return { message: 'Sales controller is working' };
  }

  @Get('test-sale/:id')
  async testSale(@Param('id') id: string) {
    console.log('Testing sale with ID:', id);
    try {
      const sale = await this.salesService.getSaleById(id, 'test-tenant-id');
      return { message: 'Sale found', sale };
    } catch (error: unknown) {
      return { message: 'Sale not found', error: getErrorMessage(error) };
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
    } catch (error: unknown) {
      return { message: 'Database error', error: getErrorMessage(error) };
    }
  }

  @Get('analytics')
  @Permissions('view_reports')
  async getAnalytics(@Req() req: SalesRequest) {
    if (!req.user.tenantId) {
      throw new UnauthorizedException('Invalid user context');
    }
    return this.salesService.getAnalytics(req.user.tenantId);
  }

  @Get(':id/receipt')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('view_sales')
  async getReceipt(
    @Param('id') id: string,
    @Query('type') type: string,
    @Req() req: SalesRequest,
  ) {
    const requestId = Math.random().toString(36).substring(2, 9);
    const logContext = {
      requestId,
      saleId: id,
      userId: getActorUserId(req.user),
      tenantId: req.user?.tenantId,
    };

    try {
      if (!id) {
        throw new BadRequestException('Sale ID is required');
      }
      if (!req.user?.tenantId) {
        throw new UnauthorizedException('Invalid user context');
      }

      const effectiveBranchId = this.resolveSalesBranchScope(req);
      const receiptType = type === 'merchant' ? 'merchant' : 'customer';
      return (await this.salesService.getReceipt(
        id,
        req.user.tenantId,
        effectiveBranchId,
        receiptType,
      )) as unknown;
    } catch (error: unknown) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      console.error('Error generating receipt', {
        ...logContext,
        error: getErrorMessage(error),
      });
      throw new InternalServerErrorException('Failed to generate receipt');
    }
  }

  @Get('recent')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('view_sales')
  async getRecentSales(@Req() req: SalesRequest) {
    const requestId = Math.random().toString(36).substring(2, 9);
    const logContext = {
      requestId,
      userId: getActorUserId(req.user),
      tenantId: req.user?.tenantId,
    };

    console.log('Recent sales request received:', { ...logContext });

    try {
      if (!req.user?.tenantId) {
        console.error('Missing tenant ID in user context', logContext);
        throw new UnauthorizedException('Invalid user context');
      }

      const effectiveBranchId = this.resolveSalesBranchScope(req);
      console.log('Fetching recent sales...', logContext);
      const recentSales = await this.salesService.getRecentSales(
        req.user.tenantId,
        10,
        effectiveBranchId,
      );

      console.log(`Found ${recentSales.length} recent sales`, {
        ...logContext,
        salesCount: recentSales.length,
      });

      return recentSales;
    } catch (error: unknown) {
      console.error('Error fetching recent sales:', {
        ...logContext,
        error: getErrorMessage(error),
        stack: getErrorStack(error),
        errorName: getErrorName(error),
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
  async create(
    @Body()
    createSaleDto: CreateSaleDto & { mpesaTransactionId?: string },
    @Req() req: SalesRequest,
  ) {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    if (!req.user.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    // Add branch ID from the request body or from the user's default branch
    const branchId = createSaleDto.branchId || req.user.branchId;
    const actorUserId = getActorUserId(req.user);

    if (!actorUserId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const saleData = {
      ...createSaleDto,
      branchId, // Include the branch ID in the sale data
    };

    try {
      const sale = await this.salesService.createSale(
        saleData,
        req.user.tenantId,
        actorUserId,
      );

      return {
        success: true,
        data: sale,
        message: 'Sale created successfully',
      };
    } catch (error: unknown) {
      console.error('Error creating sale:', error);
      // Log the full error details for debugging
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      // Re-throw known exceptions as-is
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      // For unknown errors, include the actual error message
      throw new InternalServerErrorException(getErrorMessage(error));
    }
  }

  @Post(':id/returns')
  @Permissions('create_sales')
  async createReturn(
    @Param('id') id: string,
    @Body()
    body: {
      items: {
        productId: string;
        quantity: number;
        unitPrice: number;
        variationId?: string;
        isResalable?: boolean;
      }[];
      reason?: string;
      refundMethod?: string;
    },
    @Req() req: SalesRequest,
  ) {
    const actorUserId = getActorUserId(req.user);
    if (!actorUserId) {
      throw new UnauthorizedException('User not authenticated');
    }

    if (!req.user.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      throw new BadRequestException('Return must include at least one item');
    }

    try {
      const result = await this.salesService.createReturn(
        id,
        req.user.tenantId,
        actorUserId,
        body.items,
        body.reason,
        body.refundMethod,
      );
      return {
        success: true,
        data: result,
        message: 'Return created successfully',
      };
    } catch (error: unknown) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      console.error('Error creating return:', error);
      throw new InternalServerErrorException('Failed to create return');
    }
  }

  @Get()
  @Permissions('view_sales')
  async listSales(@Req() req: SalesRequest) {
    if (!req.user.tenantId) {
      throw new UnauthorizedException('Invalid user context');
    }
    const effectiveBranchId = this.resolveSalesBranchScope(req);
    return this.salesService.listSales(req.user.tenantId, effectiveBranchId);
  }

  @Get(':id')
  @Permissions('view_sales')
  async getSaleById(@Param('id') id: string, @Req() req: SalesRequest) {
    if (!req.user.tenantId) {
      throw new UnauthorizedException('Invalid user context');
    }
    const effectiveBranchId = this.resolveSalesBranchScope(req);
    return this.salesService.getSaleById(
      id,
      req.user?.tenantId,
      effectiveBranchId,
    );
  }

  // Credit management endpoints
  @Get('credits/all')
  @RequireModules('credits')
  @Permissions('view_sales')
  async getCredits(@Req() req: SalesRequest) {
    if (!req.user.tenantId) {
      throw new UnauthorizedException('Invalid user context');
    }
    const effectiveBranchId = this.resolveSalesBranchScope(req);
    return this.salesService.getCredits(req.user.tenantId, effectiveBranchId);
  }

  @Get('credits/:id')
  @RequireModules('credits')
  @Permissions('view_sales')
  async getCreditById(@Param('id') id: string, @Req() req: SalesRequest) {
    if (!req.user.tenantId) {
      throw new UnauthorizedException('Invalid user context');
    }
    const effectiveBranchId = this.resolveSalesBranchScope(req);
    return this.salesService.getCreditById(
      id,
      req.user.tenantId,
      effectiveBranchId,
    );
  }

  @Post('credits/:id/payment')
  @RequireModules('credits')
  @Permissions('create_sales')
  async makeCreditPayment(
    @Param('id') creditId: string,
    @Body() body: { amount: number; paymentMethod: string; notes?: string },
    @Req() req: SalesRequest,
  ) {
    const userId = getActorUserId(req.user);
    if (!req.user.tenantId || !userId) {
      throw new UnauthorizedException('Invalid user context');
    }
    return this.salesService.makeCreditPayment(
      creditId,
      body.amount,
      body.paymentMethod,
      req.user.tenantId,
      userId,
      body.notes,
    );
  }

  @Get('credits/score')
  @RequireModules('credits')
  @Permissions('view_sales')
  async getCreditScore(@Req() req: SalesRequest & { query: SalesQuery }) {
    const customerName = queryString(req.query.customerName);
    const customerPhone = queryString(req.query.customerPhone);
    if (!req.user.tenantId || !customerName) {
      throw new BadRequestException('Tenant and customerName are required');
    }
    console.log('getCreditScore called with:', {
      customerName,
      customerPhone,
      tenantId: req.user.tenantId,
    });
    try {
      const effectiveBranchId = this.resolveSalesBranchScope(req);
      const result = await this.salesService.calculateCustomerCreditScore(
        req.user.tenantId,
        customerName,
        customerPhone,
        effectiveBranchId,
      );
      console.log('getCreditScore result:', result);
      return result;
    } catch (error: unknown) {
      console.error('getCreditScore error:', error);
      throw error;
    }
  }

  @Post('credits/eligibility')
  @RequireModules('credits')
  @Permissions('view_sales')
  async checkCreditEligibility(
    @Body()
    body: {
      customerName: string;
      customerPhone?: string;
      requestedAmount: number;
    },
    @Req() req: SalesRequest,
  ) {
    if (!req.user.tenantId) {
      throw new UnauthorizedException('Invalid user context');
    }
    console.log('checkCreditEligibility called with:', {
      body,
      tenantId: req.user.tenantId,
    });
    try {
      const effectiveBranchId = this.resolveSalesBranchScope(req);
      const result = await this.salesService.checkCreditEligibility(
        req.user.tenantId,
        body.customerName,
        body.requestedAmount,
        body.customerPhone,
        effectiveBranchId,
      );
      console.log('checkCreditEligibility result:', result);
      return result;
    } catch (error: unknown) {
      console.error('checkCreditEligibility error:', error);
      throw error;
    }
  }

  @Get('credits/analytics')
  @RequireModules('credits')
  @Permissions('view_sales')
  async getCreditAnalytics(@Req() req: SalesRequest & { query: SalesQuery }) {
    const startDate = queryString(req.query.startDate);
    const endDate = queryString(req.query.endDate);
    if (!req.user.tenantId) {
      throw new UnauthorizedException('Invalid user context');
    }
    console.log('getCreditAnalytics called with:', {
      tenantId: req.user.tenantId,
      startDate,
      endDate,
    });
    try {
      const effectiveBranchId = this.resolveSalesBranchScope(req);
      const result = await this.salesService.getCreditAnalytics(
        req.user.tenantId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
        effectiveBranchId,
      );
      console.log('getCreditAnalytics result:', result);
      return result;
    } catch (error: unknown) {
      console.error('getCreditAnalytics error:', error);
      throw error;
    }
  }

  @Get('credits/customer-history')
  @RequireModules('credits')
  @Permissions('view_sales')
  async getCustomerCreditHistory(
    @Req() req: SalesRequest & { query: SalesQuery },
  ) {
    const customerName = queryString(req.query.customerName);
    const customerPhone = queryString(req.query.customerPhone);
    if (!req.user.tenantId || !customerName) {
      throw new BadRequestException('Tenant and customerName are required');
    }
    console.log('getCustomerCreditHistory called with:', {
      tenantId: req.user.tenantId,
      customerName,
      customerPhone,
    });
    try {
      const effectiveBranchId = this.resolveSalesBranchScope(req);
      const result = await this.salesService.getCustomerCreditHistory(
        req.user.tenantId,
        customerName,
        customerPhone,
        effectiveBranchId,
      );
      console.log('getCustomerCreditHistory result:', result);
      return result;
    } catch (error: unknown) {
      console.error('getCustomerCreditHistory error:', error);
      throw error;
    }
  }

  @Get('credits/aging')
  @RequireModules('credits')
  @Permissions('view_sales')
  async getCreditAgingAnalysis(@Req() req: SalesRequest) {
    if (!req.user.tenantId) {
      throw new UnauthorizedException('Invalid user context');
    }
    console.log('getCreditAgingAnalysis called with:', {
      tenantId: req.user.tenantId,
    });
    try {
      const effectiveBranchId = this.resolveSalesBranchScope(req);
      const result = await this.salesService.getCreditAgingAnalysis(
        req.user.tenantId,
        effectiveBranchId,
      );
      console.log('getCreditAgingAnalysis result:', result);
      return result;
    } catch (error: unknown) {
      console.error('getCreditAgingAnalysis error:', error);
      throw error;
    }
  }
}
