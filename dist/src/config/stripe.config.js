"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateStripeConfig = exports.stripeConfig = void 0;
exports.stripeConfig = {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    priceIds: {
        basic: process.env.STRIPE_BASIC_PRICE_ID || 'price_basic_monthly',
        pro: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_monthly',
        enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_monthly',
    },
};
const validateStripeConfig = () => {
    const requiredVars = [
        'STRIPE_SECRET_KEY',
        'STRIPE_PUBLISHABLE_KEY',
        'STRIPE_WEBHOOK_SECRET',
    ];
    const missing = requiredVars.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
        console.warn(`Missing Stripe environment variables: ${missing.join(', ')}`);
        console.warn('Stripe features will be disabled');
        return false;
    }
    return true;
};
exports.validateStripeConfig = validateStripeConfig;
//# sourceMappingURL=stripe.config.js.map