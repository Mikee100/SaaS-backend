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
let MpesaController = class MpesaController {
    async initiatePayment(body, res) {
        let { phoneNumber, amount } = body;
        amount = parseFloat(amount);
        if (isNaN(amount) || amount <= 0) {
            return res
                .status(common_1.HttpStatus.BAD_REQUEST)
                .json({ error: 'Invalid amount. Must be a positive number.' });
        }
        if (amount < 10) {
            return res
                .status(common_1.HttpStatus.BAD_REQUEST)
                .json({ error: 'Minimum amount is 10 KES' });
        }
        amount = Math.floor(amount);
        const consumerKey = process.env.MPESA_CONSUMER_KEY ||
            'JFvBXWMm0yPfiDwTWNPbc2TodFikv8VOBcIhDQ1xbRIBr7TE';
        const consumerSecret = process.env.MPESA_CONSUMER_SECRET ||
            'Q16rZBLRjCN1VXaBMmzInA3QpGX0MXidMYY0EUweif6PsvbsUQ8GLBLiqZHaebk9';
        const shortCode = process.env.MPESA_SHORTCODE || '174379';
        const passkey = process.env.MPESA_PASSKEY ||
            'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
        const callbackURL = process.env.MPESA_CALLBACK_URL || 'https://mydomain.com/path';
        if (!phoneNumber || !/^(07|2547|25407|\+2547)\d{8}$/.test(phoneNumber)) {
            return res.status(common_1.HttpStatus.BAD_REQUEST).json({
                error: 'Invalid phone number format. Use format: 07XXXXXXXX, 2547XXXXXXXX, or +2547XXXXXXXX',
            });
        }
        phoneNumber = phoneNumber.replace(/^0/, '254').replace(/^\+/, '');
        const now = new Date();
        const timestamp = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0'),
            String(now.getHours()).padStart(2, '0'),
            String(now.getMinutes()).padStart(2, '0'),
            String(now.getSeconds()).padStart(2, '0'),
        ].join('');
        const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
        try {
            const tokenResponse = await axios_1.default.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
                auth: {
                    username: consumerKey,
                    password: consumerSecret,
                },
                headers: {
                    'Content-Type': 'application/json',
                },
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
                AccountReference: body.reference || 'Saas Platform',
                TransactionDesc: body.transactionDesc || 'Payment for Saas Platform',
            }, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            return res.status(common_1.HttpStatus.OK).json({
                success: true,
                message: 'Payment request initiated successfully',
                data: stkResponse.data,
            });
        }
        catch (error) {
            console.error('M-Pesa API Error:', {
                request: error.config?.data,
                response: error.response?.data,
                message: error.message,
            });
            const errorMessage = error.response?.data?.errorMessage ||
                error.response?.data?.message ||
                'Failed to process payment';
            return res
                .status(error.response?.status || common_1.HttpStatus.INTERNAL_SERVER_ERROR)
                .json({
                success: false,
                error: errorMessage,
                code: error.response?.data?.errorCode,
            });
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
exports.MpesaController = MpesaController = __decorate([
    (0, common_1.Controller)('mpesa')
], MpesaController);
//# sourceMappingURL=mpesa.controller.js.map