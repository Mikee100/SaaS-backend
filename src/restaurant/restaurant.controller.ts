import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DiningTableService } from './services/dining-table/dining-table.service';
import { RestaurantOrderService } from './services/restaurant-order/restaurant-order.service';
import { RestaurantBomService } from './services/restaurant-bom/restaurant-bom.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('restaurant')
@UseGuards(AuthGuard('jwt'))
export class RestaurantController {
  constructor(
    private readonly tableService: DiningTableService,
    private readonly orderService: RestaurantOrderService,
    private readonly bomService: RestaurantBomService,
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

  @Put('tables/:id')
  async updateTable(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: { number?: string; capacity?: number },
  ) {
    const tenantId = req.user.tenantId;
    await this.assertRestaurantEnabled(tenantId);
    return this.tableService.updateDetails(id, tenantId, data);
  }

  @Get('orders')
  async getActiveOrders(@Req() req: any) {
    const tenantId = req.user.tenantId;
    await this.assertRestaurantEnabled(tenantId);
    const branchId = this.resolveBranchId(req);
    return this.orderService.findAllActive(tenantId, branchId);
  }

  @Get('bom/recipes')
  async getBomRecipes(@Req() req: any) {
    const tenantId = req.user.tenantId;
    await this.assertRestaurantEnabled(tenantId);
    const branchId = this.resolveBranchId(req);
    return this.bomService.findAllActive(tenantId, branchId);
  }

  @Get('bom/recipes/:productId')
  async getProductBomRecipe(@Req() req: any, @Param('productId') productId: string) {
    const tenantId = req.user.tenantId;
    await this.assertRestaurantEnabled(tenantId);
    const branchId = this.resolveBranchId(req);
    return this.bomService.findActiveByProduct(tenantId, branchId, productId);
  }

  @Post('bom/recipes')
  async saveBomRecipe(
    @Req() req: any,
    @Body()
    data: {
      productId: string;
      yieldQty?: number;
      yieldUnit?: string;
      lines: Array<{
        ingredientProductId: string;
        quantity: number;
        unit?: string;
        wastePercent?: number;
      }>;
    },
  ) {
    const tenantId = req.user.tenantId;
    await this.assertRestaurantEnabled(tenantId);
    const branchId = this.resolveBranchId(req);
    const actorUserId = req.user.userId || req.user.id;
    return this.bomService.saveRecipe(tenantId, branchId, actorUserId, data);
  }

  @Get('orders/history')
  async getOrderHistory(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('waiterId') waiterId?: string,
    @Query('status') status?: string,
  ) {
    const tenantId = req.user.tenantId;
    await this.assertRestaurantEnabled(tenantId);
    const branchId = this.resolveBranchId(req);

    const parsedFrom = from ? new Date(from) : undefined;
    const parsedTo = to ? new Date(to) : undefined;
    const safeFrom = parsedFrom && !Number.isNaN(parsedFrom.getTime()) ? parsedFrom : undefined;
    const safeTo = parsedTo && !Number.isNaN(parsedTo.getTime()) ? parsedTo : undefined;

    return this.orderService.findAll(tenantId, branchId, {
      from: safeFrom,
      to: safeTo,
      waiterId: waiterId || undefined,
      status: status || undefined,
    });
  }

  @Post('orders')
  async createOrder(@Req() req: any, @Body() data: any) {
    const tenantId = req.user.tenantId;
    await this.assertRestaurantEnabled(tenantId);
    const branchId = this.resolveBranchId(req);
    const actorUserId = req.user.userId || req.user.id;
    const waiterId = data?.waiterId || actorUserId;
    return this.orderService.create(tenantId, branchId, { ...data, waiterId });
  }

  @Post('orders/:id/items')
  async addOrderItems(@Req() req: any, @Param('id') id: string, @Body() data: { items: any[] }) {
    const tenantId = req.user.tenantId;
    await this.assertRestaurantEnabled(tenantId);
    return this.orderService.addItems(id, tenantId, data.items || []);
  }

  @Put('orders/:id/status')
  async updateOrderStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: { status: string; isManagerOverride?: boolean; voidReason?: string },
  ) {
    const tenantId = req.user.tenantId;
    await this.assertRestaurantEnabled(tenantId);
    const actorUserId = req.user.userId || req.user.id;
    return this.orderService.updateStatus(
      id,
      tenantId,
      data.status,
      data.isManagerOverride,
      actorUserId,
      data.voidReason,
    );
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
