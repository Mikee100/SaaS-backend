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
exports.MpesaController = void 0;
const common_1 = require("@nestjs/common");
const mpesa_service_1 = require("./mpesa.service");
const sales_service_1 = require("../sales/sales.service");
let MpesaController = class MpesaController {
    mpesaService;
    salesService;
    constructor(mpesaService, salesService) {
        this.mpesaService = mpesaService;
        this.salesService = salesService;
    }
    async initiatePayment(body, res) {
        try {
            const { phoneNumber, amount, reference, transactionDesc, tenantId } = body;
            if (!tenantId) {
                return res.status(common_1.HttpStatus.BAD_REQUEST).json({ error: 'Tenant ID required' });
            }
            const stkData = await this.mpesaService.initiateStkPush(tenantId, phoneNumber, amount, reference, transactionDesc);
            await this.mpesaService.createTransaction({
                phoneNumber,
                amount,
                status: 'pending',
                merchantRequestID: stkData.MerchantRequestID,
                checkoutRequestID: stkData.CheckoutRequestID,
                tenantId,
                saleData: body.saleData,
            });
            return res.status(common_1.HttpStatus.OK).json({
                success: true,
                message: 'Payment request initiated successfully',
                data: stkData,
            });
        }
        catch (error) {
            console.error('M-Pesa Initiation Error:', error.message);
            return res.status(common_1.HttpStatus.BAD_REQUEST).json({
                success: false,
                error: error.message,
            });
        }
    }
    async mpesaWebhook(body, res) {
        try {
            const { Body: callbackBody } = body;
            const result = callbackBody.stkCallback;
            const checkoutRequestId = result.CheckoutRequestID;
            const status = result.ResultCode === 0 ? 'success' : 'failed';
            let mpesaReceipt = undefined;
            const message = result.ResultDesc;
            if (status === 'success') {
                const callbackMetadata = result.CallbackMetadata.Item;
                const receiptItem = callbackMetadata.find((item) => item.Name === 'MpesaReceiptNumber');
                mpesaReceipt = receiptItem ? receiptItem.Value : undefined;
            }
            await this.mpesaService.updateTransaction(checkoutRequestId, {
                status,
                mpesaReceipt,
                responseCode: result.ResultCode.toString(),
                responseDesc: message,
            });
            if (status === 'success') {
                const mpesaTx = await this.mpesaService.prisma.mpesaTransaction.findFirst({
                    where: { checkoutRequestID: checkoutRequestId },
                });
                if (mpesaTx && mpesaTx.saleData) {
                    const saleData = mpesaTx.saleData;
                    await this.salesService.createSale({
                        items: saleData.items,
                        paymentMethod: 'mpesa',
                        amountReceived: mpesaTx.amount,
                        customerName: saleData.customerName,
                        customerPhone: saleData.customerPhone,
                        mpesaTransactionId: mpesaTx.id,
                        idempotencyKey: `mpesa_${mpesaTx.id}`,
                    }, mpesaTx.tenantId, mpesaTx.userId || '');
                }
            }
            return res.status(common_1.HttpStatus.OK).json({ success: true });
        }
        catch (error) {
            console.error('Webhook Error:', error);
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Webhook processing failed' });
        }
    }
    async getConfig(tenantId, res) {
        try {
            const config = await this.mpesaService.getTenantMpesaConfig(tenantId, false);
            return res.json({
                consumerKey: config.consumerKey,
                consumerSecret: config.consumerSecret,
                shortCode: config.shortCode,
                passkey: config.passkey,
                callbackUrl: config.callbackUrl,
                environment: config.environment,
                isActive: config.isActive,
            });
        }
        catch (error) {
            return res.status(common_1.HttpStatus.BAD_REQUEST).json({ error: error.message });
        }
    }
    async updateConfig(body, res) {
        try {
            const { tenantId, mpesaConsumerKey, mpesaConsumerSecret, mpesaShortCode, mpesaPasskey, mpesaCallbackUrl, mpesaIsActive, mpesaEnvironment } = body;
            if (!mpesaConsumerKey || !mpesaConsumerSecret || !mpesaShortCode || !mpesaPasskey || !mpesaCallbackUrl) {
                return res.status(common_1.HttpStatus.BAD_REQUEST).json({ error: 'All M-Pesa configuration fields are required' });
            }
            const encryptedSecret = this.mpesaService['encrypt'](mpesaConsumerSecret);
            const encryptedPasskey = this.mpesaService['encrypt'](mpesaPasskey);
            await this.mpesaService.prisma.tenant.update({
                where: { id: tenantId },
                data: {
                    mpesaConsumerKey,
                    mpesaConsumerSecret: encryptedSecret,
                    mpesaShortCode,
                    mpesaPasskey: encryptedPasskey,
                    mpesaCallbackUrl,
                    mpesaIsActive,
                    mpesaEnvironment,
                },
            });
            return res.json({ success: true, message: 'M-Pesa config updated' });
        }
        catch (error) {
            return res.status(common_1.HttpStatus.BAD_REQUEST).json({ error: error.message });
        }
    }
    async getByCheckoutId(checkoutRequestId, res) {
        try {
            const transaction = await this.mpesaService.prisma.mpesaTransaction.findFirst({
                where: { checkoutRequestID: checkoutRequestId },
            });
            return res.json(transaction);
        }
        catch (error) {
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch transaction' });
        }
    }
};
exports.MpesaController = MpesaController;
__decorate([
    (0, common_1.Post)('initiate'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "initiatePayment", null);
__decorate([
    (0, common_1.Post)('webhook'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "mpesaWebhook", null);
__decorate([
    (0, common_1.Get)('config'),
    __param(0, (0, common_1.Query)('tenantId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Post)('config'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "updateConfig", null);
__decorate([
    (0, common_1.Get)('transaction/:checkoutRequestId'),
    __param(0, (0, common_1.Param)('checkoutRequestId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "getByCheckoutId", null);
exports.MpesaController = MpesaController = __decorate([
    (0, common_1.Controller)('mpesa'),
    __metadata("design:paramtypes", [mpesa_service_1.MpesaService,
        sales_service_1.SalesService])
], MpesaController);
//# sourceMappingURL=mpesa.controller.js.map