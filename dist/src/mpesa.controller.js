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
            return res.status(200).json({
                success: true,
                message: 'Payment request initiated successfully',
                data: {
                    ...stkResponse.data,
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
            }
        }
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
exports.MpesaController = MpesaController = __decorate([
    (0, common_1.Controller)('mpesa'),
    __metadata("design:paramtypes", [mpesa_service_1.MpesaService,
        sales_service_1.SalesService,
        prisma_service_1.PrismaService])
], MpesaController);
//# sourceMappingURL=mpesa.controller.js.map