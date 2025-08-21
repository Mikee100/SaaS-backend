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
exports.PaymentController = void 0;
const common_1 = require("@nestjs/common");
const payment_service_1 = require("./payment.service");
const passport_1 = require("@nestjs/passport");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const permissions_guard_1 = require("../auth/permissions.guard");
let PaymentController = class PaymentController {
    paymentService;
    constructor(paymentService) {
        this.paymentService = paymentService;
    }
    async savePaymentMethod(body, req) {
        console.log('--- /payments/methods API HIT ---');
        console.log('Body:', body);
        console.log('User:', req.user);
        try {
            await this.paymentService.addPaymentMethod(req.user?.tenantId, body.paymentMethodId);
            console.log('Payment method saved successfully');
            return { success: true };
        }
        catch (error) {
            console.error('Error saving payment method:', error.message);
            return { success: false, error: error.message };
        }
    }
    async getPaymentMethods(req) {
        try {
            const methods = await this.paymentService.getPaymentMethods(req.user.tenantId);
            return {
                success: true,
                methods,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
    async processPayment(body, req) {
        try {
            const result = await this.paymentService.processOneTimePayment(req.user.tenantId, body.amount, body.currency, body.description, body.metadata || {});
            return {
                success: true,
                paymentId: result.paymentId,
                clientSecret: result.clientSecret,
                amount: result.amount,
                currency: result.currency,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
    async confirmPayment(body, req) {
        try {
            const result = await this.paymentService.confirmPayment(body.paymentId, body.paymentIntentId);
            return {
                success: true,
                paymentId: result.paymentId,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
    async generateInvoice(body, req) {
        try {
            const invoice = await this.paymentService.generateInvoice(body.subscriptionId, body.amount, body.currency || 'usd');
            return {
                success: true,
                invoice,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
    async getPaymentAnalytics(period = 'month', req) {
        try {
            const analytics = await this.paymentService.getPaymentAnalytics(req.user.tenantId, period);
            return {
                success: true,
                analytics,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
    async getPaymentHistory(limit = 50, offset = 0, req) {
        try {
            const history = await this.paymentService.getPaymentHistory(req.user.tenantId, limit, offset);
            return {
                success: true,
                history,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
    async refundPayment(body, req) {
        try {
            const result = await this.paymentService.refundPayment(body.paymentId, body.amount, body.reason);
            return {
                success: true,
                refundId: result.refundId,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
    async addPaymentMethod(body, req) {
        try {
            await this.paymentService.addPaymentMethod(req.user.tenantId, body.paymentMethodId);
            return {
                success: true,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
    async removePaymentMethod(body, req) {
        try {
            await this.paymentService.removePaymentMethod(req.user.tenantId, body.paymentMethodId);
            return {
                success: true,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
    async getPaymentStatus(paymentId, req) {
        try {
            return {
                success: true,
                paymentId,
                status: 'completed',
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
};
exports.PaymentController = PaymentController;
__decorate([
    (0, common_1.Post)('methods'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "savePaymentMethod", null);
__decorate([
    (0, common_1.Get)('methods'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "getPaymentMethods", null);
__decorate([
    (0, common_1.Post)('process'),
    (0, permissions_decorator_1.Permissions)('edit_billing'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "processPayment", null);
__decorate([
    (0, common_1.Post)('confirm'),
    (0, permissions_decorator_1.Permissions)('edit_billing'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "confirmPayment", null);
__decorate([
    (0, common_1.Post)('generate-invoice'),
    (0, permissions_decorator_1.Permissions)('edit_billing'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "generateInvoice", null);
__decorate([
    (0, common_1.Get)('analytics'),
    (0, permissions_decorator_1.Permissions)('view_billing'),
    __param(0, (0, common_1.Query)('period')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "getPaymentAnalytics", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, permissions_decorator_1.Permissions)('view_billing'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('offset')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "getPaymentHistory", null);
__decorate([
    (0, common_1.Post)('refund'),
    (0, permissions_decorator_1.Permissions)('edit_billing'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "refundPayment", null);
__decorate([
    (0, common_1.Post)('methods'),
    (0, permissions_decorator_1.Permissions)('edit_billing'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "addPaymentMethod", null);
__decorate([
    (0, common_1.Post)('methods/remove'),
    (0, permissions_decorator_1.Permissions)('edit_billing'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "removePaymentMethod", null);
__decorate([
    (0, common_1.Get)('status/:paymentId'),
    (0, permissions_decorator_1.Permissions)('view_billing'),
    __param(0, (0, common_1.Param)('paymentId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "getPaymentStatus", null);
exports.PaymentController = PaymentController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard),
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payment_service_1.PaymentService])
], PaymentController);
//# sourceMappingURL=payment.controller.js.map