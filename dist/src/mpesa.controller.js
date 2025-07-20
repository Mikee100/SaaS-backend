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
const axios_1 = require("axios");
const mpesa_service_1 = require("./mpesa.service");
const sales_service_1 = require("./sales/sales.service");
const prisma_service_1 = require("./prisma.service");
let MpesaController = class MpesaController {
    mpesaService;
    salesService;
    prisma;
    constructor(mpesaService, salesService, prisma) {
        this.mpesaService = mpesaService;
        this.salesService = salesService;
        this.prisma = prisma;
    }
    async initiateMpesa(body, req, res) {
        let { phoneNumber, amount, saleData } = body;
        amount = parseFloat(amount);
        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount. Must be a positive number.' });
        }
        if (amount < 10) {
            return res.status(400).json({ error: 'Minimum amount is 10 KES' });
        }
        amount = Math.floor(amount);
        const consumerKey = process.env.MPESA_CONSUMER_KEY || 'JFvBXWMm0yPfiDwTWNPbc2TodFikv8VOBcIhDQ1xbRIBr7TE';
        const consumerSecret = process.env.MPESA_CONSUMER_SECRET || 'Q16rZBLRjCN1VXaBMmzInA3QpGX0MXidMYY0EUweif6PsvbsUQ8GLBLiqZHaebk9';
        const shortCode = process.env.MPESA_SHORTCODE || '174379';
        const passkey = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
        const callbackURL = process.env.MPESA_CALLBACK_URL || 'https://mydomain.com/path';
        if (!phoneNumber || !/^(07|2547|25407|\+2547)\d{8}$/.test(phoneNumber)) {
            return res.status(400).json({ error: 'Invalid phone number format. Use format: 07XXXXXXXX, 2547XXXXXXXX, or +2547XXXXXXXX' });
        }
        phoneNumber = phoneNumber.replace(/^0/, '254').replace(/^\+/, '');
        const now = new Date();
        const timestamp = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0'),
            String(now.getHours()).padStart(2, '0'),
            String(now.getMinutes()).padStart(2, '0'),
            String(now.getSeconds()).padStart(2, '0')
        ].join('');
        const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
        try {
            const tokenResponse = await axios_1.default.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
                auth: {
                    username: consumerKey,
                    password: consumerSecret,
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const accessToken = tokenResponse.data.access_token;
            const stkResponse = await axios_1.default.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
                BusinessShortCode: shortCode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerPayBillOnline',
                Amount: amount,
                PartyA: phoneNumber,
                PartyB: shortCode,
                PhoneNumber: phoneNumber,
                CallBackURL: callbackURL,
                AccountReference: 'SaaSPlatform',
                TransactionDesc: 'POS Payment',
            }, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                }
            });
            const userId = req.user?.userId || undefined;
            await this.mpesaService.createTransaction({
                userId,
                phoneNumber,
                amount,
                status: 'pending',
                merchantRequestId: stkResponse.data.MerchantRequestID,
                checkoutRequestId: stkResponse.data.CheckoutRequestID,
                message: stkResponse.data.ResponseDescription,
                saleData: saleData || null,
            });
            return res.status(200).json({
                success: true,
                message: 'Payment request initiated successfully',
                data: stkResponse.data
            });
        }
        catch (error) {
            console.error('M-Pesa API Error:', {
                request: error.config?.data,
                response: error.response?.data,
                message: error.message
            });
            const errorMessage = error.response?.data?.errorMessage ||
                error.response?.data?.message ||
                'Failed to process payment';
            return res.status(error.response?.status || 500).json({
                success: false,
                error: errorMessage,
                code: error.response?.data?.errorCode
            });
        }
    }
    async mpesaWebhook(body, res) {
        console.log('M-Pesa Webhook received:', JSON.stringify(body, null, 2));
        try {
            const result = body.Body?.stkCallback;
            if (!result)
                return res.status(400).json({ error: 'Invalid webhook payload' });
            const checkoutRequestId = result.CheckoutRequestID;
            const status = result.ResultCode === 0 ? 'success' : 'failed';
            let mpesaReceipt = undefined;
            let message = result.ResultDesc;
            let responseCode = String(result.ResultCode);
            let responseDesc = result.ResultDesc;
            if (status === 'success' && result.CallbackMetadata) {
                const receiptItem = result.CallbackMetadata.Item.find((i) => i.Name === 'MpesaReceiptNumber');
                mpesaReceipt = receiptItem ? receiptItem.Value : undefined;
            }
            await this.mpesaService.updateTransaction(checkoutRequestId, {
                status,
                mpesaReceipt,
                responseCode,
                responseDesc,
                message,
            });
            if (status === 'success') {
                const mpesaTx = await this.mpesaService.prisma.mpesaTransaction.findFirst({
                    where: { checkoutRequestId },
                    include: { sale: true }
                });
                if (mpesaTx && !mpesaTx.sale && mpesaTx.saleData) {
                    const saleData = mpesaTx.saleData;
                    try {
                        await this.salesService.createSale({
                            items: saleData.items,
                            paymentMethod: 'mpesa',
                            amountReceived: mpesaTx.amount,
                            customerName: saleData.customerName,
                            customerPhone: saleData.customerPhone,
                            mpesaTransactionId: mpesaTx.id,
                            idempotencyKey: `mpesa_${mpesaTx.id}`,
                        }, saleData.tenantId, saleData.userId);
                    }
                    catch (err) {
                        await this.mpesaService.updateTransaction(checkoutRequestId, {
                            status: 'stock_unavailable',
                            message: 'Stock unavailable for one or more items',
                        });
                        return res.status(409).json({ error: 'Stock unavailable for one or more items' });
                    }
                }
            }
            return res.status(200).json({ received: true });
        }
        catch (err) {
            return res.status(500).json({ error: 'Failed to process webhook' });
        }
    }
    async getByCheckoutId(checkoutRequestId) {
        return this.mpesaService.prisma.mpesaTransaction.findFirst({ where: { checkoutRequestId } });
    }
};
exports.MpesaController = MpesaController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "initiateMpesa", null);
__decorate([
    (0, common_1.Post)('webhook'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "mpesaWebhook", null);
__decorate([
    (0, common_1.Get)('by-checkout-id/:checkoutRequestId'),
    __param(0, (0, common_1.Param)('checkoutRequestId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "getByCheckoutId", null);
exports.MpesaController = MpesaController = __decorate([
    (0, common_1.Controller)('mpesa'),
    __metadata("design:paramtypes", [mpesa_service_1.MpesaService,
        sales_service_1.SalesService,
        prisma_service_1.PrismaService])
], MpesaController);
//# sourceMappingURL=mpesa.controller.js.map