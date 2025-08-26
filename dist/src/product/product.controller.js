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
exports.ProductController = void 0;
const common_1 = require("@nestjs/common");
const product_service_1 = require("./product.service");
const passport_1 = require("@nestjs/passport");
const platform_express_1 = require("@nestjs/platform-express");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const permissions_guard_1 = require("../auth/permissions.guard");
let ProductController = class ProductController {
    productService;
    constructor(productService) {
        this.productService = productService;
    }
    async findAll(req) {
        if (req.user.branchId) {
            console.log('==============================');
            console.log('[ProductController] Branch switch detected. Fetching products for branchId:', req.user.branchId, 'tenantId:', req.user.tenantId);
            console.log('==============================');
            return this.productService.findAllByBranch(req.user.branchId, req.user.tenantId);
        }
        return this.productService.findAllByTenant(req.user.tenantId);
    }
    async create(body, req) {
        let branchId = body.branchId;
        if (req.user.branchId) {
            branchId = req.user.branchId;
        }
        return this.productService.createProduct({
            ...body,
            tenantId: req.user.tenantId,
            branchId,
        }, req.user.userId, req.ip);
    }
    async bulkUpload(file, req) {
        return this.productService.bulkUpload(file, req.user);
    }
    async getBulkUploadProgress(uploadId) {
        return product_service_1.ProductService.getBulkUploadProgress(uploadId);
    }
    async randomizeStocks(req) {
        return this.productService.randomizeAllStocks(req.user.tenantId);
    }
    async clearAll(req) {
        return this.productService.clearAll(req.user.tenantId);
    }
    async getQrCode(id, req, res) {
        return this.productService.generateQrCode(id, req.user.tenantId, res);
    }
    async update(id, body, req) {
        return this.productService.updateProduct(id, body, req.user.tenantId, req.user.userId, req.ip);
    }
    async remove(id, req) {
        return this.productService.deleteProduct(id, req.user.tenantId, req.user.userId, req.ip);
    }
};
exports.ProductController = ProductController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('view_products'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('create_products'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('bulk-upload'),
    (0, permissions_decorator_1.Permissions)('create_products'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "bulkUpload", null);
__decorate([
    (0, common_1.Get)('bulk-upload-progress/:uploadId'),
    __param(0, (0, common_1.Param)('uploadId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "getBulkUploadProgress", null);
__decorate([
    (0, common_1.Post)('randomize-stocks'),
    (0, permissions_decorator_1.Permissions)('edit_products'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "randomizeStocks", null);
__decorate([
    (0, common_1.Delete)('clear-all'),
    (0, permissions_decorator_1.Permissions)('delete_products'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "clearAll", null);
__decorate([
    (0, common_1.Get)(':id/qr'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "getQrCode", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, permissions_decorator_1.Permissions)('edit_products'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)('delete_products'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "remove", null);
exports.ProductController = ProductController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard),
    (0, common_1.Controller)('products'),
    __metadata("design:paramtypes", [product_service_1.ProductService])
], ProductController);
//# sourceMappingURL=product.controller.js.map