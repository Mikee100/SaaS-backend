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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const inventory_service_1 = require("./inventory.service");
const passport_1 = require("@nestjs/passport");
const create_inventory_dto_1 = require("./create-inventory.dto");
const update_inventory_dto_1 = require("./update-inventory.dto");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const permissions_guard_1 = require("../auth/permissions.guard");
const trial_guard_1 = require("../auth/trial.guard");
let InventoryController = class InventoryController {
    inventoryService;
    constructor(inventoryService) {
        this.inventoryService = inventoryService;
    }
    async findAll(req) {
        const tenantId = req.user.tenantId;
        const branchId = req.headers['x-branch-id'] || req.user.branchId;
        if (branchId) {
            return this.inventoryService.findAllByBranch(tenantId, branchId);
        }
        return this.inventoryService.findAllByTenant(tenantId);
    }
    async findAdvanced(req) {
        const tenantId = req.user.tenantId;
        const branchId = req.headers['x-branch-id'] || req.user.branchId;
        return this.inventoryService.findAdvanced(tenantId, branchId);
    }
    async getMovements(req) {
        const tenantId = req.user.tenantId;
        const branchId = req.headers['x-branch-id'] || req.user.branchId;
        return this.inventoryService.getMovements(tenantId, branchId);
    }
    async getAlerts(req) {
        const tenantId = req.user.tenantId;
        const branchId = req.headers['x-branch-id'] || req.user.branchId;
        return this.inventoryService.getAlerts(tenantId, branchId);
    }
    async getLocations(req) {
        const tenantId = req.user.tenantId;
        const branchId = req.headers['x-branch-id'] || req.user.branchId;
        return this.inventoryService.getLocations(tenantId, branchId);
    }
    async getForecast(req) {
        const tenantId = req.user.tenantId;
        const branchId = req.headers['x-branch-id'] || req.user.branchId;
        return this.inventoryService.getForecast(tenantId, branchId);
    }
    async createMovement(req, dto) {
        const tenantId = req.user.tenantId;
        return this.inventoryService.createMovement(dto, tenantId, req.user.userId, req.ip);
    }
    async create(req, dto) {
        const tenantId = req.user.tenantId;
        return this.inventoryService.createInventory(dto, tenantId, req.user.userId, req.ip);
    }
    async update(req, id, dto) {
        const tenantId = req.user.tenantId;
        return this.inventoryService.updateInventory(id, dto, tenantId, req.user.userId, req.ip);
    }
    async remove(req, id) {
        const tenantId = req.user.tenantId;
        return this.inventoryService.deleteInventory(id, tenantId, req.user.userId, req.ip);
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('view_inventory'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('advanced'),
    (0, permissions_decorator_1.Permissions)('view_inventory'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "findAdvanced", null);
__decorate([
    (0, common_1.Get)('movements'),
    (0, permissions_decorator_1.Permissions)('view_inventory'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getMovements", null);
__decorate([
    (0, common_1.Get)('alerts'),
    (0, permissions_decorator_1.Permissions)('view_inventory'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getAlerts", null);
__decorate([
    (0, common_1.Get)('locations'),
    (0, permissions_decorator_1.Permissions)('view_inventory'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getLocations", null);
__decorate([
    (0, common_1.Get)('forecast'),
    (0, permissions_decorator_1.Permissions)('view_inventory'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getForecast", null);
__decorate([
    (0, common_1.Post)('movements'),
    (0, permissions_decorator_1.Permissions)('edit_inventory'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "createMovement", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('create_inventory'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_inventory_dto_1.CreateInventoryDto]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, permissions_decorator_1.Permissions)('edit_inventory'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_inventory_dto_1.UpdateInventoryDto]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)('delete_inventory'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "remove", null);
exports.InventoryController = InventoryController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard, trial_guard_1.TrialGuard),
    (0, common_1.Controller)('inventory'),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService])
], InventoryController);
//# sourceMappingURL=inventory.controller.js.map