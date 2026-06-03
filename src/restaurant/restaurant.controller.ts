import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DiningTableService } from './services/dining-table/dining-table.service';
import { RestaurantOrderService } from './services/restaurant-order/restaurant-order.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('restaurant')
@UseGuards(AuthGuard('jwt'))
export class RestaurantController {
  constructor(
    private readonly tableService: DiningTableService,
    private readonly orderService: RestaurantOrderService,
    private readonly prisma: PrismaService,
  ) {}

  private async assertRestaurantEnabled(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { restaurantFeaturesEnabled: true },
    });

    if (!tenant?.restaurantFeaturesEnabled) {
      throw new ForbiddenException('Restaurant add-on is not enabled for this tenant');
    }
  }

  private resolveBranchId(req: any): string {
    const branchId = req.headers['x-branch-id'] || req.user?.branchId;
    if (!branchId || typeof branchId !== 'string') {
      throw new BadRequestException('Branch context is required for restaurant operations');
    }
    return branchId;
  }

  @Get('config')
  async getConfig(@Req() req: any) {
    const tenantId = req.user.tenantId;
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { restaurantFeaturesEnabled: true },
    });
    return {
      enabled: tenant?.restaurantFeaturesEnabled || false,
    };
  }

  @Get('tables')
  async getTables(@Req() req: any) {
    const tenantId = req.user.tenantId;
    await this.assertRestaurantEnabled(tenantId);
    const branchId = this.resolveBranchId(req);
    return this.tableService.findAll(tenantId, branchId);
  }

  @Post('tables')
  async createTable(@Req() req: any, @Body() data: { number: string; capacity?: number }) {
    const tenantId = req.user.tenantId;
    await this.assertRestaurantEnabled(tenantId);
    const branchId = this.resolveBranchId(req);
    return this.tableService.create(tenantId, branchId, data);
  }

  @Get('orders')
  async getActiveOrders(@Req() req: any) {
    const tenantId = req.user.tenantId;
    await this.assertRestaurantEnabled(tenantId);
    const branchId = this.resolveBranchId(req);
    return this.orderService.findAllActive(tenantId, branchId);
  }

  @Post('orders')
  async createOrder(@Req() req: any, @Body() data: any) {
    const tenantId = req.user.tenantId;
    await this.assertRestaurantEnabled(tenantId);
    const branchId = this.resolveBranchId(req);
    // In a real app, inject user/waiter details if available
    return this.orderService.create(tenantId, branchId, { ...data, waiterId: req.user.id });
  }

  @Post('orders/:id/items')
  async addOrderItems(@Req() req: any, @Param('id') id: string, @Body() data: { items: any[] }) {
    const tenantId = req.user.tenantId;
    await this.assertRestaurantEnabled(tenantId);
    return this.orderService.addItems(id, tenantId, data.items || []);
  }

  @Put('orders/:id/status')
  async updateOrderStatus(@Req() req: any, @Param('id') id: string, @Body() data: { status: string, isManagerOverride?: boolean }) {
    const tenantId = req.user.tenantId;
    await this.assertRestaurantEnabled(tenantId);
    return this.orderService.updateStatus(id, tenantId, data.status, data.isManagerOverride);
  }

  @Post('orders/:id/checkout')
  async checkoutOrder(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    data: {
      paymentMethod: 'cash' | 'mpesa' | 'credit' | 'split';
      amountReceived?: number;
      customerName?: string;
      customerPhone?: string;
      idempotencyKey?: string;
      isManagerOverride?: boolean;
      splitPayments?: Array<{
        method: 'cash' | 'mpesa' | 'credit';
        amount: number;
        amountReceived?: number;
        mpesaTransactionId?: string;
        mpesaReceipt?: string;
        creditDueDate?: string;
        creditNotes?: string;
      }>;
    },
  ) {
    const tenantId = req.user.tenantId;
    await this.assertRestaurantEnabled(tenantId);
    const actorUserId = req.user.userId || req.user.id;

    return this.orderService.checkoutToSale(id, tenantId, actorUserId, data);
  }
}
