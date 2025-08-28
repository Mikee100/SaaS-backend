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
exports.UsageController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const prisma_service_1 = require("./prisma.service");
let UsageController = class UsageController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getStats(req) {
        const tenantId = req.user.tenantId;
        const branchId = req.headers['x-branch-id'] || req.user.branchId;
        const productsCount = await this.prisma.product.count({
            where: { tenantId, branchId: branchId || undefined },
        });
        return {
            products: { current: productsCount, limit: 10 },
        };
    }
};
exports.UsageController = UsageController;
__decorate([
    (0, common_1.Get)('stats'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsageController.prototype, "getStats", null);
exports.UsageController = UsageController = __decorate([
    (0, common_1.Controller)('usage'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsageController);
//# sourceMappingURL=usage.controller.js.map