"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const featureNames = [
        'Up to 3 users',
        'Up to 100 products',
        'Basic sales reports',
        'Up to 10 users',
        'Up to 1,000 products',
        'Advanced sales reports',
        'Analytics dashboard',
        'Email support',
        'Unlimited users',
        'Unlimited products',
        'All reports',
        'Priority support',
        'Custom branding',
        'API access',
    ];
    const features = {};
    for (const name of featureNames) {
        features[name] = await prisma.planFeature.upsert({
            where: { featureKey: name.toLowerCase().replace(/\s+/g, '_') },
            update: {},
            create: { featureName: name, featureKey: name.toLowerCase().replace(/\s+/g, '_') },
        });
    }
    const plans = [
        {
            name: 'Basic',
            stripePriceId: 'basic-monthly',
            description: 'For small businesses getting started',
            price: 0,
            currency: 'USD',
            interval: 'monthly',
            maxUsers: 3,
            maxProducts: 100,
            maxSalesPerMonth: 200,
            analyticsEnabled: false,
            advancedReports: false,
            prioritySupport: false,
            customBranding: false,
            apiAccess: false,
            featureNames: [
                'Up to 3 users',
                'Up to 100 products',
                'Basic sales reports',
            ],
        },
        {
            name: 'Pro',
            stripePriceId: 'pro-monthly',
            description: 'For growing businesses',
            price: 29,
            currency: 'USD',
            interval: 'monthly',
            maxUsers: 10,
            maxProducts: 1000,
            maxSalesPerMonth: 2000,
            analyticsEnabled: true,
            advancedReports: true,
            prioritySupport: false,
            customBranding: false,
            apiAccess: false,
            featureNames: [
                'Up to 10 users',
                'Up to 1,000 products',
                'Advanced sales reports',
                'Analytics dashboard',
                'Email support',
            ],
        },
        {
            name: 'Enterprise',
            stripePriceId: 'enterprise-monthly',
            description: 'For large or custom businesses',
            price: 99,
            currency: 'USD',
            interval: 'monthly',
            maxUsers: null,
            maxProducts: null,
            maxSalesPerMonth: null,
            analyticsEnabled: true,
            advancedReports: true,
            prioritySupport: true,
            customBranding: true,
            apiAccess: true,
            featureNames: [
                'Unlimited users',
                'Unlimited products',
                'All reports',
                'Analytics dashboard',
                'Priority support',
                'Custom branding',
                'API access',
            ],
        },
    ];
    for (const planData of plans) {
        const plan = await prisma.plan.upsert({
            where: { stripePriceId: planData.stripePriceId },
            update: {},
            create: {
                name: planData.name,
                stripePriceId: planData.stripePriceId,
                description: planData.description,
                price: planData.price,
                interval: planData.interval,
                maxUsers: planData.maxUsers,
                maxProducts: planData.maxProducts,
                maxSalesPerMonth: planData.maxSalesPerMonth,
                analyticsEnabled: planData.analyticsEnabled,
                advancedReports: planData.advancedReports,
                prioritySupport: planData.prioritySupport,
                customBranding: planData.customBranding,
                apiAccess: planData.apiAccess,
            },
        });
        for (const fname of planData.featureNames) {
            await prisma.planFeatureOnPlan.create({
                data: {
                    planId: plan.id,
                    featureId: features[fname].id,
                },
            });
        }
    }
    console.log('Seeded plans and features: Basic, Pro, Enterprise');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map