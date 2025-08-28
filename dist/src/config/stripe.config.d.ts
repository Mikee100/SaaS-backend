export declare const stripeConfig: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
    priceIds: {
        basic: string;
        pro: string;
        enterprise: string;
    };
};
export declare const validateStripeConfig: () => boolean;
