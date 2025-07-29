"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    await prisma.plan.upsert({
        where: { name: 'Basic' },
        update: {},
        create: {
            name: 'Basic',
            description: 'For small businesses getting started',
            price: 0,
            currency: 'USD',
            interval: 'monthly',
            features: [
                'Up to 3 users',
                'Up to 100 products',
                'Basic sales reports',
            ],
            maxUsers: 3,
            maxProducts: 100,
            maxSalesPerMonth: 200,
            analyticsEnabled: false,
            advancedReports: false,
            prioritySupport: false,
            customBranding: false,
            apiAccess: false,
        },
    });
    await prisma.plan.upsert({
        where: { name: 'Pro' },
        update: {},
        create: {
            name: 'Pro',
            description: 'For growing businesses',
            price: 29,
            currency: 'USD',
            interval: 'monthly',
            features: [
                'Up to 10 users',
                'Up to 1,000 products',
                'Advanced sales reports',
                'Analytics dashboard',
                'Email support',
            ],
            maxUsers: 10,
            maxProducts: 1000,
            maxSalesPerMonth: 2000,
            analyticsEnabled: true,
            advancedReports: true,
            prioritySupport: false,
            customBranding: false,
            apiAccess: false,
        },
    });
    await prisma.plan.upsert({
        where: { name: 'Enterprise' },
        update: {},
        create: {
            name: 'Enterprise',
            description: 'For large or custom businesses',
            price: 99,
            currency: 'USD',
            interval: 'monthly',
            features: [
                'Unlimited users',
                'Unlimited products',
                'All reports',
                'Analytics dashboard',
                'Priority support',
                'Custom branding',
                'API access',
            ],
            maxUsers: null,
            maxProducts: null,
            maxSalesPerMonth: null,
            analyticsEnabled: true,
            advancedReports: true,
            prioritySupport: true,
            customBranding: true,
            apiAccess: true,
        },
    });
    console.log('Seeded plans: Basic, Pro, Enterprise');
    const superadminEmail = 'superadmin@gmail.com';
    const superadminPassword = '$2b$10$8QwQn1QwQn1QwQn1QwQn1uQwQn1QwQn1QwQn1QwQn1QwQn1QwQn1u';
    const existingSuperadmin = await prisma.user.findUnique({ where: { email: superadminEmail } });
    if (!existingSuperadmin) {
        await prisma.user.create({
            data: {
                email: superadminEmail,
                password: superadminPassword,
                name: 'Platform Superadmin',
                isSuperadmin: true,
            },
        });
        console.log('Superadmin user created:', superadminEmail);
    }
    else {
        console.log('Superadmin user already exists:', superadminEmail);
    }
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