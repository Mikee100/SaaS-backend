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
    async findAllByTenant(tenantId) {
        return this.prisma.inventory.findMany({
            where: { tenantId },
            include: { product: true },
            orderBy: { updatedAt: 'desc' },
        });
    }
    async createInventory(dto, tenantId, actorUserId, ip) {
        const result = await this.prisma.$transaction(async (prisma) => {
            const existingInventory = await prisma.inventory.findFirst({
                where: {
                    productId: dto.productId,
                    tenantId: tenantId,
                },
            });
            let inventory;
            if (existingInventory) {
                inventory = await prisma.inventory.update({
                    where: { id: existingInventory.id },
                    data: { quantity: dto.quantity },
                });
            }
            else {
                inventory = await prisma.inventory.create({
                    data: {
                        ...dto,
                        tenantId,
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
        this.realtimeGateway.emitInventoryUpdate({ productId: dto.productId, quantity: dto.quantity });
        return result;
    }
    async updateInventory(id, dto, tenantId, actorUserId, ip) {
        const result = await this.prisma.$transaction(async (prisma) => {
            const inventory = await prisma.inventory.updateMany({
                where: { id, tenantId },
                data: dto,
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
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_log_service_1.AuditLogService,
        realtime_gateway_1.RealtimeGateway])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map