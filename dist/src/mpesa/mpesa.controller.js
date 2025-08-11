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
let MpesaController = MpesaController_1 = class MpesaController {
    mpesaService;
    salesService;
    logger = new common_1.Logger(MpesaController_1.name);
    constructor(mpesaService, salesService) {
        this.mpesaService = mpesaService;
        this.salesService = salesService;
    }
    async handleCallback(data) {
        try {
            if (data.Body?.stkCallback) {
                const callbackData = data.Body.stkCallback;
                const checkoutRequestID = callbackData.CheckoutRequestID;
                const resultCode = callbackData.ResultCode;
                const resultDesc = callbackData.ResultDesc;
                const transaction = await this.mpesaService.getTransactionByCheckoutRequestId(checkoutRequestID);
                if (!transaction) {
                    this.logger.warn(`Transaction not found for checkout request ID: ${checkoutRequestID}`);
                    return { ResultCode: 0, ResultDesc: 'Success' };
                }
                const updateData = {
                    responseCode: resultCode.toString(),
                    responseDesc: resultDesc,
                    transactionTime: new Date(),
                };
                if (resultCode === '0') {
                    const callbackMetadata = callbackData.CallbackMetadata || {};
                    const items = Array.isArray(callbackMetadata.Item) ? callbackMetadata.Item : [];
                    for (const item of items) {
                        switch (item.Name) {
                            case 'MpesaReceiptNumber':
                                updateData.mpesaReceipt = item.Value;
                                break;
                            case 'PhoneNumber':
                                updateData.phoneNumber = item.Value;
                                break;
                            case 'Amount':
                                updateData.amount = parseFloat(item.Value);
                                break;
                        }
                    }
                    updateData.status = 'success';
                    updateData.message = 'Payment received successfully';
                }
                else {
                    updateData.status = 'failed';
                    updateData.message = resultDesc || 'Payment failed';
                }
                await this.mpesaService.updateTransaction(transaction.id, updateData);
                if (transaction.saleData) {
                    try {
                        await this.salesService.create({
                            ...transaction.saleData,
                            mpesaTransactionId: transaction.id,
                            paymentMethod: 'mpesa',
                        });
                    }
                    catch (saleError) {
                        this.logger.error('Error creating sale from M-Pesa transaction', saleError);
                        await this.mpesaService.updateTransaction(transaction.id, {
                            status: 'failed',
                            message: `Sale creation failed: ${saleError.message}`,
                        });
                    }
                }
            }
            return {
                ResultCode: 0,
                ResultDesc: 'Success',
            };
        }
        catch (error) {
            this.logger.error('Error processing M-Pesa callback', error);
            return {
                ResultCode: 1,
                ResultDesc: 'Error processing callback',
            };
        }
    }
    async getTransaction(checkoutRequestId) {
        const transaction = await this.mpesaService.getTransactionByCheckoutRequestId(checkoutRequestId);
        if (!transaction) {
            throw new common_1.NotFoundException('Transaction not found');
        }
        return transaction;
    }
    async getTransactionsByPhone(phoneNumber, limit = '10') {
        return this.mpesaService.getTransactionsByPhoneNumber(phoneNumber, parseInt(limit, 10));
    }
    async cancelTransaction(id) {
        return this.mpesaService.updateTransaction(id, {
            status: 'cancelled',
            message: 'Transaction cancelled by user',
        });
    }
    async cleanupOldPendingTransactions() {
        return this.mpesaService.cleanupOldPendingTransactions();
    }
};
exports.MpesaController = MpesaController;
__decorate([
    (0, common_1.Post)('callback'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "handleCallback", null);
__decorate([
    (0, common_1.Get)('transaction/:checkoutRequestId'),
    __param(0, (0, common_1.Param)('checkoutRequestId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "getTransaction", null);
__decorate([
    (0, common_1.Get)('transactions/phone/:phoneNumber'),
    __param(0, (0, common_1.Param)('phoneNumber')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "getTransactionsByPhone", null);
__decorate([
    (0, common_1.Post)('transaction/:id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "cancelTransaction", null);
__decorate([
    (0, common_1.Post)('cleanup-pending'),
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