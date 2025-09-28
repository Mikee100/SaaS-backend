"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const audit_log_service_1 = require("../audit-log.service");
const realtime_gateway_1 = require("../realtime.gateway");
let InventoryService = class InventoryService {
    prisma;
    auditLogService;
    realtimeGateway;
    constructor(prisma, auditLogService, realtimeGateway) {
        this.prisma = prisma;
        this.auditLogService = auditLogService;
        this.realtimeGateway = realtimeGateway;
    }
    async findAllByBranch(tenantId, branchId) {
        return this.prisma.inventory.findMany({
            where: { tenantId, branchId },
            include: { product: true },
            orderBy: { updatedAt: 'desc' },
        });
    }
    async findAllByTenant(tenantId) {
        return this.prisma.inventory.findMany({
            where: { tenantId },
            include: { product: true, branch: true },
            orderBy: { updatedAt: 'desc' },
        });
    }
    async createInventory(dto, tenantId, actorUserId, ip) {
        const result = await this.prisma.$transaction(async (prisma) => {
            const existingInventory = await prisma.inventory.findFirst({
                where: {
                    productId: dto.productId,
                    tenantId: tenantId,
                    branchId: dto.branchId,
                },
            });
            let inventory;
            if (existingInventory) {
                inventory = await prisma.inventory.update({
                    where: { id: existingInventory.id },
                    data: { quantity: dto.quantity, branchId: dto.branchId },
                });
            }
            else {
                inventory = await prisma.inventory.create({
                    data: {
                        id: `inv_${Date.now()}`,
                        productId: dto.productId,
                        quantity: dto.quantity,
                        tenantId,
                        branchId: dto.branchId,
                        updatedAt: new Date(),
                    },
                });
            }
            await prisma.product.updateMany({
                where: {
                    id: dto.productId,
                    tenantId: tenantId,
                },
                data: {
                    stock: dto.quantity,
                },
            });
            return inventory;
        });
        if (this.auditLogService) {
            await this.auditLogService.log(actorUserId || null, 'inventory_created', { inventoryId: result.id, ...dto }, ip);
        }
        this.realtimeGateway.emitInventoryUpdate({
            productId: dto.productId,
            quantity: dto.quantity,
        });
        return result;
    }
    async updateInventory(id, dto, tenantId, actorUserId, ip) {
        const result = await this.prisma.$transaction(async (prisma) => {
            const inventory = await prisma.inventory.updateMany({
                where: { id, tenantId },
                data: {
                    quantity: dto.quantity,
                    branchId: dto.branchId,
                },
            });
            const inventoryRecord = await prisma.inventory.findFirst({
                where: { id, tenantId },
            });
            if (inventoryRecord && dto.quantity !== undefined) {
                await prisma.product.updateMany({
                    where: {
                        id: inventoryRecord.productId,
                        tenantId: tenantId,
                    },
                    data: {
                        stock: dto.quantity,
                    },
                });
            }
            return inventory;
        });
        if (this.auditLogService) {
            await this.auditLogService.log(actorUserId || null, 'inventory_updated', { inventoryId: id, updatedFields: dto }, ip);
        }
        this.realtimeGateway.emitInventoryUpdate({ inventoryId: id, ...dto });
        return result;
    }
    async deleteInventory(id, tenantId, actorUserId, ip) {
        const result = await this.prisma.inventory.deleteMany({
            where: { id, tenantId },
        });
        if (this.auditLogService) {
            await this.auditLogService.log(actorUserId || null, 'inventory_deleted', { inventoryId: id }, ip);
        }
        return result;
    }
    async findAdvanced(tenantId, branchId) {
        const where = branchId ? { tenantId, branchId } : { tenantId };
        return this.prisma.inventory.findMany({
            where,
            include: {
                product: true,
                branch: true,
            },
            orderBy: { updatedAt: 'desc' },
        });
    }
    async getMovements(tenantId, branchId) {
        const where = branchId ? { tenantId, branchId } : { tenantId };
        return this.prisma.inventoryMovement.findMany({
            where,
            include: {
                product: true,
                branch: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
    async getAlerts(tenantId, branchId) {
        const where = branchId ? { tenantId, branchId } : { tenantId };
        return this.prisma.inventoryAlert.findMany({
            where,
            include: {
                product: true,
                branch: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getLocations(tenantId, branchId) {
        const where = branchId ? { tenantId, branchId } : { tenantId };
        return this.prisma.inventoryLocation.findMany({
            where,
            orderBy: { name: 'asc' },
        });
    }
    async getForecast(tenantId, branchId) {
        const where = branchId ? { tenantId, branchId } : { tenantId };
        const inventory = await this.prisma.inventory.findMany({
            where,
            include: { product: true },
        });
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sales = await this.prisma.sale.findMany({
            where: {
                tenantId,
                ...(branchId && { branchId }),
                createdAt: { gte: thirtyDaysAgo },
            },
            include: {
                SaleItem: {
                    include: { product: true },
                },
            },
        });
        const forecastData = inventory.map((item) => {
            const productSales = sales.flatMap(sale => sale.SaleItem.filter(item => item.productId === item.productId));
            const totalSold = productSales.reduce((sum, saleItem) => sum + saleItem.quantity, 0);
            const averageDailySales = totalSold / 30;
            const daysUntilStockout = item.quantity / Math.max(averageDailySales, 0.1);
            const recommendedOrder = Math.max(item.reorderPoint - item.quantity, 0);
            const confidence = Math.min(totalSold > 0 ? 80 : 60, 95);
            return {
                productId: item.productId,
                product: item.product,
                currentStock: item.quantity,
                averageDailySales: Math.round(averageDailySales * 100) / 100,
                daysUntilStockout: Math.round(daysUntilStockout),
                recommendedOrder: Math.round(recommendedOrder),
                confidence,
            };
        });
        return forecastData;
    }
    async createMovement(dto, tenantId, actorUserId, ip) {
        const currentInventory = await this.prisma.inventory.findFirst({
            where: {
                productId: dto.productId,
                tenantId,
                branchId: dto.branchId,
            },
        });
        if (!currentInventory) {
            throw new Error('Inventory record not found');
        }
        const previousQuantity = currentInventory.quantity;
        let newQuantity = previousQuantity;
        switch (dto.type) {
            case 'in':
                newQuantity = previousQuantity + dto.quantity;
                break;
            case 'out':
                newQuantity = Math.max(0, previousQuantity - dto.quantity);
                break;
            case 'adjustment':
                newQuantity = dto.quantity;
                break;
            case 'transfer':
                break;
        }
        await this.prisma.inventory.updateMany({
            where: {
                productId: dto.productId,
                tenantId,
                branchId: dto.branchId,
            },
            data: { quantity: newQuantity, updatedAt: new Date() },
        });
        const movement = await this.prisma.inventoryMovement.create({
            data: {
                productId: dto.productId,
                type: dto.type,
                quantity: dto.quantity,
                previousQuantity,
                newQuantity,
                reason: dto.reason,
                location: dto.location,
                createdBy: actorUserId || '',
                branchId: dto.branchId,
                tenantId,
            },
        });
        await this.checkAndCreateAlerts(currentInventory, newQuantity, tenantId, dto.branchId);
        if (this.auditLogService) {
            await this.auditLogService.log(actorUserId || null, 'inventory_movement', { movementId: movement.id, ...dto }, ip);
        }
        this.realtimeGateway.emitInventoryUpdate({
            productId: dto.productId,
            quantity: newQuantity,
            type: dto.type,
        });
        return movement;
    }
    async checkAndCreateAlerts(inventory, newQuantity, tenantId, branchId) {
        const alerts = [];
        if (newQuantity === 0) {
            alerts.push({
                productId: inventory.productId,
                type: 'out_of_stock',
                message: `Product ${inventory.product?.name} is out of stock`,
                severity: 'critical',
                branchId,
                tenantId,
            });
        }
        else if (newQuantity <= inventory.reorderPoint) {
            alerts.push({
                productId: inventory.productId,
                type: 'low_stock',
                message: `Product ${inventory.product?.name} is low on stock (${newQuantity} remaining)`,
                severity: 'medium',
                branchId,
                tenantId,
            });
        }
        else if (newQuantity > inventory.maxStock) {
            alerts.push({
                productId: inventory.productId,
                type: 'over_stock',
                message: `Product ${inventory.product?.name} is over stocked (${newQuantity} > ${inventory.maxStock})`,
                severity: 'low',
                branchId,
                tenantId,
            });
        }
        for (const alert of alerts) {
            await this.prisma.inventoryAlert.create({ data: alert });
        }
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_log_service_1.AuditLogService,
        realtime_gateway_1.RealtimeGateway])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map