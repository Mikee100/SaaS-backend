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
var BillingLoggerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingLoggerService = void 0;
const common_1 = require("@nestjs/common");
const audit_log_service_1 = require("../audit-log.service");
let BillingLoggerService = BillingLoggerService_1 = class BillingLoggerService {
    auditLogService;
    logger = new common_1.Logger(BillingLoggerService_1.name);
    constructor(auditLogService) {
        this.auditLogService = auditLogService;
    }
    async logBillingEvent(userId, event, data, level = 'info') {
        const logData = {
            event,
            userId,
            timestamp: new Date().toISOString(),
            ...data,
        };
        switch (level) {
            case 'error':
                this.logger.error(`${event}: ${JSON.stringify(logData)}`);
                break;
            case 'warn':
                this.logger.warn(`${event}: ${JSON.stringify(logData)}`);
                break;
            default:
                this.logger.log(`${event}: ${JSON.stringify(logData)}`);
        }
        try {
            await this.auditLogService.log(userId, `billing_${event}`, data);
        }
        catch (error) {
            this.logger.error('Failed to log to audit service', error);
        }
    }
    async logSubscriptionEvent(userId, event, subscriptionId, tenantId, additionalData = {}) {
        await this.logBillingEvent(userId, `subscription_${event}`, {
            subscriptionId,
            tenantId,
            ...additionalData,
        });
    }
    async logPaymentEvent(userId, event, amount, currency, additionalData = {}) {
        await this.logBillingEvent(userId, `payment_${event}`, {
            amount,
            currency,
            ...additionalData,
        });
    }
    async logWebhookEvent(eventType, eventId, tenantId, additionalData = {}) {
        await this.logBillingEvent('system', `webhook_${eventType}`, {
            eventId,
            tenantId,
            ...additionalData,
        });
    }
    async logSecurityEvent(userId, event, ipAddress, userAgent, additionalData = {}) {
        await this.logBillingEvent(userId, `security_${event}`, {
            ipAddress,
            userAgent,
            ...additionalData,
        }, 'warn');
    }
    async logPlanChange(userId, oldPlan, newPlan, tenantId, additionalData = {}) {
        await this.logBillingEvent(userId, 'plan_change', {
            oldPlan,
            newPlan,
            tenantId,
            ...additionalData,
        });
    }
    async logBillingError(userId, error, context = {}) {
        await this.logBillingEvent(userId, 'error', {
            error: error.message,
            stack: error.stack,
            ...context,
        }, 'error');
    }
};
exports.BillingLoggerService = BillingLoggerService;
exports.BillingLoggerService = BillingLoggerService = BillingLoggerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [audit_log_service_1.AuditLogService])
], BillingLoggerService);
//# sourceMappingURL=billing-logger.service.js.map