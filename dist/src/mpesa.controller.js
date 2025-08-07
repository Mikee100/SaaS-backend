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
            return res.status(400).json({
                success: false,
                error: 'Invalid amount. Must be a positive number.'
            });
        }
        if (amount < 10) {
            return res.status(400).json({
                success: false,
                error: 'Minimum amount is 10 KES'
            });
        }
        amount = Math.floor(amount);
        if (!phoneNumber || !/^(07|2547|25407|\+2547)\d{8}$/.test(phoneNumber)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number format. Use format: 07XXXXXXXX, 2547XXXXXXXX, or +2547XXXXXXXX'
            });
        }
        phoneNumber = phoneNumber.replace(/^0/, '254').replace(/^\+/, '');
        const consumerKey = process.env.MPESA_CONSUMER_KEY || 'JFvBXWMm0yPfiDwTWNPbc2TodFikv8VOBcIhDQ1xbRIBr7TE';
        const consumerSecret = process.env.MPESA_CONSUMER_SECRET || 'Q16rZBLRjCN1VXaBMmzInA3QpGX0MXidMYY0EUweif6PsvbsUQ8GLBLiqZHaebk9';
        const shortCode = process.env.MPESA_SHORTCODE || '174379';
        const passkey = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
        let callbackURL = process.env.MPESA_CALLBACK_URL;
        if (!callbackURL) {
            callbackURL = 'https://webhook.site/d17f3362-20f5-4ecf-a848-a3ca16321908';
            console.warn('⚠️  M-Pesa Callback URL not set. Using default webhook.site URL.');
            console.warn('   For production, set MPESA_CALLBACK_URL environment variable.');
            console.warn('   For development, use ngrok: ngrok http 3001');
            callbackURL = 'https://webhook.site/abc123def456';
        }
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
                },
                timeout: 10000
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
                },
                timeout: 30000
            });
            const userId = req.user?.userId || undefined;
            const transaction = await this.mpesaService.createTransaction({
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
                data: {
                    ...stkResponse.data,
                    transactionId: transaction.id,
                    checkoutRequestId: transaction.checkoutRequestId
                }
            });
        }
        catch (error) {
            console.error('M-Pesa API Error:', {
                request: error.config?.data,
                response: error.response?.data,
                message: error.message,
                status: error.response?.status
            });
            const errorMessage = error.response?.data?.errorMessage ||
                error.response?.data?.message ||
                error.message ||
                'Failed to process payment';
            if (error.response?.data?.errorCode === '400.002.02') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid Callback URL. Please set MPESA_CALLBACK_URL environment variable to a publicly accessible URL.',
                    code: 'INVALID_CALLBACK_URL',
                    suggestion: 'Use ngrok (ngrok http 3001) or set a public webhook URL'
                });
            }
            return res.status(error.response?.status || 500).json({
                success: false,
                error: errorMessage,
                code: error.response?.data?.errorCode || 'UNKNOWN_ERROR'
            });
        }
    }
    async mpesaWebhook(body, req, res) {
        console.log('M-Pesa Webhook received:', JSON.stringify(body, null, 2));
        try {
            const result = body.Body?.stkCallback;
            if (!result) {
                console.error('Invalid webhook payload:', body);
                return res.status(400).json({ error: 'Invalid webhook payload' });
            }
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
                const mpesaTx = await this.mpesaService.getTransactionByCheckoutId(checkoutRequestId);
                if (mpesaTx && !mpesaTx.sale && mpesaTx.saleData) {
                    const saleData = mpesaTx.saleData;
                    try {
                        const tenantId = req.user?.tenantId || saleData.tenantId;
                        const userId = req.user?.id || saleData.userId;
                        if (!tenantId || !userId) {
                            console.error('Missing tenantId or userId for sale creation');
                            await this.mpesaService.updateTransaction(checkoutRequestId, {
                                status: 'failed',
                                message: 'Missing tenant or user information',
                            });
                            return res.status(400).json({ error: 'Missing tenant or user information' });
                        }
                        await this.salesService.createSale({
                            items: saleData.items,
                            paymentMethod: 'mpesa',
                            amountReceived: mpesaTx.amount,
                            customerName: saleData.customerName,
                            customerPhone: saleData.customerPhone,
                            mpesaTransactionId: mpesaTx.id,
                            idempotencyKey: `mpesa_${mpesaTx.id}`,
                        }, tenantId, userId);
                        console.log('Sale created successfully for M-Pesa transaction:', mpesaTx.id);
                    }
                    catch (err) {
                        console.error('Failed to create sale for M-Pesa transaction:', err);
                        await this.mpesaService.updateTransaction(checkoutRequestId, {
                            status: 'stock_unavailable',
                            message: 'Stock unavailable for one or more items',
                        });
                        return res.status(409).json({
                            error: 'Stock unavailable for one or more items'
                        });
                    }
                }
            }
            return res.status(200).json({ received: true });
        }
        catch (err) {
            console.error('Webhook processing error:', err);
            return res.status(500).json({ error: 'Failed to process webhook' });
        }
    }
    async getTransactionStatus(checkoutRequestId) {
        const transaction = await this.mpesaService.getTransactionByCheckoutId(checkoutRequestId);
        if (!transaction) {
            return { error: 'Transaction not found' };
        }
        return {
            success: true,
            data: transaction
        };
    }
    async getTransactionById(id) {
        const transaction = await this.mpesaService.getTransactionById(id);
        if (!transaction) {
            return { error: 'Transaction not found' };
        }
        return {
            success: true,
            data: transaction
        };
    }
    async getUserTransactions(userId, req) {
        const transactions = await this.mpesaService.getTransactionsByUserId(userId);
        return {
            success: true,
            data: transactions
        };
    }
    async getTenantTransactions(tenantId) {
        const transactions = await this.mpesaService.getTransactionsByTenant(tenantId);
        return {
            success: true,
            data: transactions
        };
    }
    async getTransactionStats(req) {
        const stats = await this.mpesaService.getTransactionStats();
        return {
            success: true,
            data: stats
        };
    }
    async cancelTransaction(checkoutRequestId) {
        await this.mpesaService.cancelTransaction(checkoutRequestId);
        return {
            success: true,
            message: 'Transaction cancelled successfully'
        };
    }
    async getPendingTransactions() {
        const transactions = await this.mpesaService.getPendingTransactions();
        return {
            success: true,
            data: transactions
        };
    }
    async cleanupOldTransactions() {
        const result = await this.mpesaService.cleanupOldPendingTransactions();
        return {
            success: true,
            message: `Cleaned up ${result.count} old pending transactions`
        };
    }
};
exports.MpesaController = MpesaController;
__decorate([
    (0, common_1.Post)('initiate'),
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
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "mpesaWebhook", null);
__decorate([
    (0, common_1.Get)('status/:checkoutRequestId'),
    __param(0, (0, common_1.Param)('checkoutRequestId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "getTransactionStatus", null);
__decorate([
    (0, common_1.Get)('transaction/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "getTransactionById", null);
__decorate([
    (0, common_1.Get)('user/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "getUserTransactions", null);
__decorate([
    (0, common_1.Get)('tenant/:tenantId'),
    __param(0, (0, common_1.Param)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "getTenantTransactions", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "getTransactionStats", null);
__decorate([
    (0, common_1.Delete)('cancel/:checkoutRequestId'),
    __param(0, (0, common_1.Param)('checkoutRequestId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "cancelTransaction", null);
__decorate([
    (0, common_1.Get)('pending'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "getPendingTransactions", null);
__decorate([
    (0, common_1.Post)('cleanup'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "cleanupOldTransactions", null);
exports.MpesaController = MpesaController = __decorate([
    (0, common_1.Controller)('mpesa'),
    __metadata("design:paramtypes", [mpesa_service_1.MpesaService,
        sales_service_1.SalesService,
        prisma_service_1.PrismaService])
], MpesaController);
//# sourceMappingURL=mpesa.controller.js.map