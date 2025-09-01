"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MpesaService = void 0;
const common_1 = require("@nestjs/common");
let MpesaService = class MpesaService {
    async initiatePayment(dto) {
        return {
            success: true,
            message: 'Mpesa payment initiated (dummy response from service)',
            data: dto,
        };
    }
    async handleCallback(dto) {
        return {
            success: true,
            message: 'Mpesa callback received',
            data: dto,
        };
    }
    async getPaymentStatus(transactionId) {
        return {
            success: true,
            message: 'Mpesa payment status (dummy response)',
            transactionId,
            status: 'pending',
        };
    }
    async simulatePayment(dto) {
        return {
            success: true,
            message: 'Mpesa payment simulated (dummy response)',
            data: dto,
        };
    }
};
exports.MpesaService = MpesaService;
exports.MpesaService = MpesaService = __decorate([
    (0, common_1.Injectable)()
], MpesaService);
//# sourceMappingURL=mpesa.service.js.map