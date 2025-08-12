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
var MpesaController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MpesaController = void 0;
const common_1 = require("@nestjs/common");
const mpesa_service_1 = require("../mpesa.service");
const sales_service_1 = require("../sales/sales.service");
const schedule_1 = require("@nestjs/schedule");
let MpesaController = MpesaController_1 = class MpesaController {
    mpesaService;
    salesService;
    logger = new common_1.Logger(MpesaController_1.name);
    constructor(mpesaService, salesService) {
        this.mpesaService = mpesaService;
        this.salesService = salesService;
    }
    async handleCallback(callbackData) {
        try {
            const transaction = await this.mpesaService.updateTransaction(callbackData.CheckoutRequestID, {
                mpesaReceiptNumber: callbackData.MPESAReceiptNumber,
                transactionDate: new Date().toISOString(),
                phoneNumber: callbackData.PhoneNumber,
                amount: parseFloat(callbackData.Amount),
            });
            return { success: true, transaction };
        }
        catch (error) {
            this.logger.error('Error processing MPESA callback:', error);
            throw new common_1.InternalServerErrorException('Failed to process callback');
        }
    }
    async getTransactions() {
    }
    async getTransaction(id) {
        if (!transaction) {
            throw new common_1.NotFoundException('Transaction not found');
        }
        return transaction;
    }
    async getPendingTransactions() {
        return this.mpesaService.getPendingTransactions();
    }
    async cleanupOldPendingTransactions() {
        try {
            const result = await this.mpesaService.getPendingTransactions(100);
            return { success: true, count: result.length };
        }
        catch (error) {
            this.logger.error('Error cleaning up old transactions:', error);
            throw new common_1.InternalServerErrorException('Failed to clean up transactions');
        }
    }
};
exports.MpesaController = MpesaController;
__decorate([
    (0, common_1.Post)('callback'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "handleCallback", null);
__decorate([
    (0, common_1.Get)('transactions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "getTransactions", null);
__decorate([
    (0, common_1.Get)('transactions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "getTransaction", null);
__decorate([
    (0, common_1.Get)('pending'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "getPendingTransactions", null);
__decorate([
    (0, schedule_1.Cron)('0 0 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "cleanupOldPendingTransactions", null);
exports.MpesaController = MpesaController = MpesaController_1 = __decorate([
    (0, common_1.Controller)('mpesa'),
    __metadata("design:paramtypes", [mpesa_service_1.MpesaService,
        sales_service_1.SalesService])
], MpesaController);
//# sourceMappingURL=mpesa.controller.js.map