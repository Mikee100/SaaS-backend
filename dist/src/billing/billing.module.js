"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingModule = void 0;
const common_1 = require("@nestjs/common");
const billing_controller_1 = require("./billing.controller");
const payment_controller_1 = require("./payment.controller");
const subscription_controller_1 = require("./subscription.controller");
const account_controller_1 = require("./account.controller");
const billing_service_1 = require("./billing.service");
const payment_service_1 = require("./payment.service");
const stripe_service_1 = require("./stripe.service");
const subscription_service_1 = require("./subscription.service");
const billing_logger_service_1 = require("./billing-logger.service");
const tenant_configuration_service_1 = require("../config/tenant-configuration.service");
const audit_log_service_1 = require("../audit-log.service");
const user_module_1 = require("../user/user.module");
const prisma_module_1 = require("../prisma.module");
const config_module_1 = require("../config/config.module");
let BillingModule = class BillingModule {
};
exports.BillingModule = BillingModule;
exports.BillingModule = BillingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            (0, common_1.forwardRef)(() => user_module_1.UserModule),
            prisma_module_1.PrismaModule,
            config_module_1.ConfigModule,
        ],
        controllers: [billing_controller_1.BillingController, payment_controller_1.PaymentController, subscription_controller_1.SubscriptionController, account_controller_1.AccountController],
        providers: [
            billing_service_1.BillingService,
            payment_service_1.PaymentService,
            stripe_service_1.StripeService,
            subscription_service_1.SubscriptionService,
            billing_logger_service_1.BillingLoggerService,
            tenant_configuration_service_1.TenantConfigurationService,
            audit_log_service_1.AuditLogService,
        ],
        exports: [
            billing_service_1.BillingService,
            payment_service_1.PaymentService,
            stripe_service_1.StripeService,
            subscription_service_1.SubscriptionService,
            billing_logger_service_1.BillingLoggerService,
        ],
    })
], BillingModule);
//# sourceMappingURL=billing.module.js.map