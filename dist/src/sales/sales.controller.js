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
const common_2 = require("@nestjs/common");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const permissions_guard_1 = require("../auth/permissions.guard");
const common_3 = require("@nestjs/common");
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
        const requestId = Math.random().toString(36).substring(2, 9);
        const logContext = { requestId, saleId: id, userId: req.user?.id, tenantId: req.user?.tenantId };
        console.log('Receipt request received:', { ...logContext });
        try {
            if (!id) {
                console.error('Missing sale ID in request', logContext);
                throw new common_3.BadRequestException('Sale ID is required');
            }
            if (!req.user?.tenantId) {
                console.error('Missing tenant ID in user context', logContext);
                throw new common_3.UnauthorizedException('Invalid user context');
            }
            console.log('Fetching sale details...', logContext);
            const sale = await this.salesService.getSaleById(id, req.user.tenantId);
            if (!sale) {
                console.error('Sale not found', logContext);
                throw new common_2.NotFoundException('Sale not found');
            }
            console.log('Fetching tenant info...', { ...logContext, saleId: sale.id });
            const tenant = await this.salesService.getTenantInfo(req.user.tenantId);
            if (!tenant) {
                console.error('Tenant not found', logContext);
                throw new common_2.NotFoundException('Business information not found');
            }
            const response = {
                id: sale.id,
                saleId: sale.id,
                date: sale.createdAt,
                customerName: sale.customerName || 'Walk-in Customer',
                customerPhone: sale.customerPhone || 'N/A',
                items: sale.items.map(item => ({
                    productId: item.productId,
                    name: item.name || 'Unknown Product',
                    price: item.price,
                    quantity: item.quantity,
                    total: item.price * item.quantity
                })),
                subtotal: sale.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                total: sale.total,
                vatAmount: sale.vatAmount || 0,
                paymentMethod: sale.paymentType,
                amountReceived: sale.total,
                change: 0,
                businessInfo: {
                    name: tenant.name || 'Business Name',
                    address: tenant.address || 'N/A',
                    phone: tenant.contactPhone || 'N/A',
                    email: tenant.contactEmail || 'N/A',
                },
                mpesaTransaction: sale.mpesaTransactions?.[0] ? {
                    phoneNumber: sale.mpesaTransactions[0].phoneNumber,
                    amount: sale.mpesaTransactions[0].amount,
                    status: sale.mpesaTransactions[0].status,
                    mpesaReceipt: sale.mpesaTransactions[0].transactionId,
                    message: sale.mpesaTransactions[0].responseDesc || '',
                    transactionDate: sale.mpesaTransactions[0].createdAt,
                } : null,
            };
            console.log('Receipt generated successfully', { ...logContext, saleId: sale.id });
            return response;
        }
        catch (error) {
            console.error('Error generating receipt:', {
                ...logContext,
                error: error.message,
                stack: error.stack,
                errorName: error.name,
                errorCode: error.status || error.statusCode || 500,
            });
            if (error instanceof common_3.BadRequestException ||
                error instanceof common_3.UnauthorizedException ||
                error instanceof common_2.NotFoundException) {
                throw error;
            }
            throw new common_3.InternalServerErrorException('Failed to generate receipt. Please try again later.');
        }
    }
    async getRecentSales(req) {
        const requestId = Math.random().toString(36).substring(2, 9);
        const logContext = {
            requestId,
            userId: req.user?.id,
            tenantId: req.user?.tenantId
        };
        console.log('Recent sales request received:', { ...logContext });
        try {
            if (!req.user?.tenantId) {
                console.error('Missing tenant ID in user context', logContext);
                throw new common_3.UnauthorizedException('Invalid user context');
            }
            console.log('Fetching recent sales...', logContext);
            const recentSales = await this.salesService.getRecentSales(req.user.tenantId, 10);
            console.log(`Found ${recentSales.length} recent sales`, {
                ...logContext,
                salesCount: recentSales.length
            });
            return recentSales;
        }
        catch (error) {
            console.error('Error fetching recent sales:', {
                ...logContext,
                error: error.message,
                stack: error.stack,
                errorName: error.name,
            });
            return [];
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
    (0, common_1.Get)('recent'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('view_sales'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getRecentSales", null);
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