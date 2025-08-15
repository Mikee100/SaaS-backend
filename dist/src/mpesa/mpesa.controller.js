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
    async initiatePayment(body) {
        const consumerKey = process.env.MPESA_CONSUMER_KEY;
        const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
        const shortcode = process.env.MPESA_SHORTCODE;
        const passkey = process.env.MPESA_PASSKEY;
        const callbackUrl = process.env.MPESA_CALLBACK_URL;
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
        const tokenRes = await axios_1.default.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
            headers: { Authorization: `Basic ${auth}` }
        });
        const accessToken = tokenRes.data.access_token;
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = Buffer.from(shortcode + passkey + timestamp).toString('base64');
        const stkPayload = {
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: body.amount,
            PartyA: body.phoneNumber,
            PartyB: shortcode,
            PhoneNumber: body.phoneNumber,
            CallBackURL: callbackUrl,
            AccountReference: body.reference,
            TransactionDesc: body.transactionDesc || 'Payment',
        };
        const stkRes = await axios_1.default.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', stkPayload, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        return {
            success: true,
            message: 'Mpesa STK Push initiated',
            data: stkRes.data
        };
    }
};
exports.MpesaController = MpesaController;
__decorate([
    (0, common_1.Post)('initiate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "initiatePayment", null);
exports.MpesaController = MpesaController = __decorate([
    (0, common_1.Controller)('mpesa')
], MpesaController);
//# sourceMappingURL=mpesa.controller.js.map