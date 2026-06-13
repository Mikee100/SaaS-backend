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
import { AuthenticatedRequest } from '../auth/request.types';

interface BomLineInput {
  ingredientProductId: string;
  quantity: number;
  unit?: string;
  wastePercent?: number;
}

interface OrderItemInput {
  productId: string;
  quantity: number;
  price: number;
  notes?: string;
  modifierSelections?: unknown;
}

interface CreateOrderInput {
  tableId?: string;
  waiterId?: string;
  customerName?: string;
  customerPhone?: string;
  total: number;
  items: OrderItemInput[];
}

interface CheckoutInput {
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
}

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
      throw new ForbiddenException(
        'Restaurant add-on is not enabled for this tenant',
      );
    }
  }

  private getTenantId(req: AuthenticatedRequest): string {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }
    return tenantId;
  }

  private getActorUserId(req: AuthenticatedRequest): string {
    const actorUserId = req.user.userId ?? req.user.sub;
    if (!actorUserId) {
      throw new BadRequestException('User context is required');
    }
    return actorUserId;
  }

  private getActorContext(req: AuthenticatedRequest): {
    userId: string;
    name?: string;
    roles: string[];
  } {
    const userId = this.getActorUserId(req);
    const roles = Array.isArray(req.user.roles)
      ? req.user.roles.map((role) => String(role).toLowerCase())
      : req.user.role
        ? [String(req.user.role).toLowerCase()]
        : [];

    return {
      userId,
      name: req.user.name,
      roles,
    };
  }

  private assertCanViewRestaurantActivity(req: AuthenticatedRequest) {
    if (req.user.isSuperadmin) return;

    const roles = Array.isArray(req.user.roles)
      ? req.user.roles.map((role) => String(role).toLowerCase())
      : req.user.role
        ? [String(req.user.role).toLowerCase()]
        : [];

    const canView = roles.some((role) =>
      ['owner', 'admin', 'manager'].includes(role),
    );

    if (!canView) {
      throw new ForbiddenException(
        'Only owner/admin accounts can view restaurant activity logs',
      );
    }
  }

  private resolveBranchId(req: AuthenticatedRequest): string {
    const branchId = req.headers['x-branch-id'] || req.user?.branchId;
    if (!branchId || typeof branchId !== 'string') {
      throw new BadRequestException(
        'Branch context is required for restaurant operations',
      );
    }
    return branchId;
  }

  @Get('config')
  async getConfig(@Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { restaurantFeaturesEnabled: true },
    });
    return {
      enabled: tenant?.restaurantFeaturesEnabled || false,
    };
  }

  @Get('tables')
  async getTables(@Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    await this.assertRestaurantEnabled(tenantId);
    const branchId = this.resolveBranchId(req);
    return this.tableService.findAll(tenantId, branchId);
  }

  @Post('tables')
  async createTable(
    @Req() req: AuthenticatedRequest,
    @Body() data: { number: string; capacity?: number },
  ) {
    const tenantId = this.getTenantId(req);
    await this.assertRestaurantEnabled(tenantId);
    const branchId = this.resolveBranchId(req);
    return this.tableService.create(tenantId, branchId, data);
  }

  @Put('tables/:id')
  async updateTable(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() data: { number?: string; capacity?: number },
  ) {
    const tenantId = this.getTenantId(req);
    await this.assertRestaurantEnabled(tenantId);
    return this.tableService.updateDetails(id, tenantId, data);
  }

  @Get('orders')
  async getActiveOrders(@Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    await this.assertRestaurantEnabled(tenantId);
    const branchId = this.resolveBranchId(req);
    return this.orderService.findAllActive(tenantId, branchId);
  }

  @Get('bom/recipes')
  async getBomRecipes(@Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    await this.assertRestaurantEnabled(tenantId);
    const branchId = this.resolveBranchId(req);
    return this.bomService.findAllActive(tenantId, branchId);
  }

  @Get('bom/recipes/:productId')
  async getProductBomRecipe(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ) {
    const tenantId = this.getTenantId(req);
    await this.assertRestaurantEnabled(tenantId);
    const branchId = this.resolveBranchId(req);
    return this.bomService.findActiveByProduct(tenantId, branchId, productId);
  }

  @Post('bom/recipes')
  async saveBomRecipe(
    @Req() req: AuthenticatedRequest,
    @Body()
    data: {
      productId: string;
      yieldQty?: number;
      yieldUnit?: string;
      lines: BomLineInput[];
    },
  ) {
    const tenantId = this.getTenantId(req);
    await this.assertRestaurantEnabled(tenantId);
    const branchId = this.resolveBranchId(req);
    const actorUserId = this.getActorUserId(req);
    return this.bomService.saveRecipe(tenantId, branchId, actorUserId, data);
  }

  @Get('orders/history')
  async getOrderHistory(
    @Req() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('waiterId') waiterId?: string,
    @Query('status') status?: string,
  ) {
    const tenantId = this.getTenantId(req);
    await this.assertRestaurantEnabled(tenantId);
    const branchId = this.resolveBranchId(req);

    const parsedFrom = from ? new Date(from) : undefined;
    const parsedTo = to ? new Date(to) : undefined;
    const safeFrom =
      parsedFrom && !Number.isNaN(parsedFrom.getTime())
        ? parsedFrom
        : undefined;
    const safeTo =
      parsedTo && !Number.isNaN(parsedTo.getTime()) ? parsedTo : undefined;

    return this.orderService.findAll(tenantId, branchId, {
      from: safeFrom,
      to: safeTo,
      waiterId: waiterId || undefined,
      status: status || undefined,
    });
  }

  @Get('activity')
  async getRestaurantActivity(
    @Req() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('actionType') actionType?: string,
    @Query('orderId') orderId?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = this.getTenantId(req);
    await this.assertRestaurantEnabled(tenantId);
    this.assertCanViewRestaurantActivity(req);
    const branchId = this.resolveBranchId(req);

    const parsedFrom = from ? new Date(from) : undefined;
    const parsedTo = to ? new Date(to) : undefined;
    const safeFrom =
      parsedFrom && !Number.isNaN(parsedFrom.getTime())
        ? parsedFrom
        : undefined;
    const safeTo =
      parsedTo && !Number.isNaN(parsedTo.getTime()) ? parsedTo : undefined;

    return this.orderService.findActivity(tenantId, branchId, {
      from: safeFrom,
      to: safeTo,
      actorUserId: actorUserId || undefined,
      actionType: actionType || undefined,
      orderId: orderId || undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('orders')
  async createOrder(
    @Req() req: AuthenticatedRequest,
    @Body() data: CreateOrderInput,
  ) {
    const tenantId = this.getTenantId(req);
    await this.assertRestaurantEnabled(tenantId);
    const branchId = this.resolveBranchId(req);
    const actorUserId = this.getActorUserId(req);
    const waiterId = data?.waiterId || actorUserId;
    return this.orderService.create(
      tenantId,
      branchId,
      { ...data, waiterId },
      this.getActorContext(req),
    );
  }

  @Post('orders/:id/items')
  async addOrderItems(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() data: { items: OrderItemInput[] },
  ) {
    const tenantId = this.getTenantId(req);
    await this.assertRestaurantEnabled(tenantId);
    return this.orderService.addItems(
      id,
      tenantId,
      data.items || [],
      this.getActorContext(req),
    );
  }

  @Put('orders/:id/status')
  async updateOrderStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    data: { status: string; isManagerOverride?: boolean; voidReason?: string },
  ) {
    const tenantId = this.getTenantId(req);
    await this.assertRestaurantEnabled(tenantId);
    const actor = this.getActorContext(req);
    return this.orderService.updateStatus(
      id,
      tenantId,
      data.status,
      data.isManagerOverride,
      actor,
      data.voidReason,
    );
  }

  @Post('orders/:id/checkout')
  async checkoutOrder(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() data: CheckoutInput,
  ) {
    const tenantId = this.getTenantId(req);
    await this.assertRestaurantEnabled(tenantId);
    const actor = this.getActorContext(req);

    return this.orderService.checkoutToSale(
      id,
      tenantId,
      actor.userId,
      data,
      actor,
    );
  }
}
