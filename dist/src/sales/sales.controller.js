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
exports.SalesController = void 0;
const common_1 = require("@nestjs/common");
const sales_service_1 = require("./sales.service");
const passport_1 = require("@nestjs/passport");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const permissions_guard_1 = require("../auth/permissions.guard");
let SalesController = class SalesController {
    salesService;
    constructor(salesService) {
        this.salesService = salesService;
    }
    async test() {
        console.log('Test endpoint called');
        return { message: 'Sales controller is working' };
    }
    async testSale(id) {
        console.log('Testing sale with ID:', id);
        try {
            const sale = await this.salesService.getSaleById(id, 'test-tenant-id');
            return { message: 'Sale found', sale };
        }
        catch (error) {
            return { message: 'Sale not found', error: error.message };
        }
    }
    async testDb() {
        console.log('Testing database connection');
        try {
            const sales = await this.salesService.listSales('test-tenant-id');
            return {
                message: 'Database connected',
                salesCount: sales.length,
                sales: sales.slice(0, 5)
            };
        }
        catch (error) {
            return { message: 'Database error', error: error.message };
        }
    }
    async getAnalytics(req) {
        return this.salesService.getAnalytics(req.user.tenantId);
    }
    async getReceipt(id, req) {
        console.log('Receipt endpoint called with ID:', id);
        console.log('User tenant ID:', req.user?.tenantId);
        try {
            const sale = await this.salesService.getSaleById(id, req.user?.tenantId);
            console.log('Sale found:', sale);
            const tenant = await this.salesService.getTenantInfo(req.user?.tenantId);
            console.log('Tenant info:', tenant);
            return {
                id: sale.saleId,
                saleId: sale.saleId,
                date: sale.date,
                customerName: sale.customerName,
                customerPhone: sale.customerPhone,
                items: sale.items.map(item => ({
                    productId: item.productId,
                    name: item.name || 'Unknown Product',
                    price: item.price,
                    quantity: item.quantity
                })),
                total: sale.total,
                paymentMethod: sale.paymentType,
                amountReceived: sale.total,
                change: 0,
                businessInfo: {
                    name: tenant?.name || 'Business Name',
                    address: tenant?.address,
                    phone: tenant?.contactPhone,
                    email: tenant?.contactEmail
                }
            };
        }
        catch (error) {
            console.error('Error in getReceipt:', error);
            throw error;
        }
    }
    async createSale(dto, req) {
        if (!dto.idempotencyKey)
            throw new Error('Missing idempotency key');
        return this.salesService.createSale(dto, req.user.tenantId, req.user.id);
    }
    async listSales(req) {
        return this.salesService.listSales(req.user.tenantId);
    }
    async getSaleById(id, req) {
        return this.salesService.getSaleById(id, req.user?.tenantId);
    }
};
exports.SalesController = SalesController;
__decorate([
    (0, common_1.Get)('test'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "test", null);
__decorate([
    (0, common_1.Get)('test-sale/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "testSale", null);
__decorate([
    (0, common_1.Get)('test-db'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "testDb", null);
__decorate([
    (0, common_1.Get)('analytics'),
    (0, permissions_decorator_1.Permissions)('view_reports'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getAnalytics", null);
__decorate([
    (0, common_1.Get)(':id/receipt'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('view_sales'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getReceipt", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('create_sales'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "createSale", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('view_sales'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "listSales", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.Permissions)('view_sales'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getSaleById", null);
exports.SalesController = SalesController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard),
    (0, common_1.Controller)('sales'),
    __metadata("design:paramtypes", [sales_service_1.SalesService])
], SalesController);
//# sourceMappingURL=sales.controller.js.map