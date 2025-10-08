import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const plans = [
  {
    name: 'Basic',
    description: 'Perfect for small businesses getting started',
    price: 0,
    interval: 'monthly',
    maxUsers: 5,
    maxProducts: 100,
    maxSalesPerMonth: 500,
    stripePriceId: 'price_1RxCYlCXIhVW50LeyY4DMAIu',
    isActive: true,
    analyticsEnabled: false,
    advancedReports: false,
    prioritySupport: false,
    customBranding: false,
    apiAccess: false,
    bulkOperations: false,
    dataExport: false,
    customFields: false,
    advancedSecurity: false,
    whiteLabel: false,
    dedicatedSupport: false,
    ssoEnabled: false,
    auditLogs: false,
    backupRestore: false,
    customIntegrations: false,
  },
  {
    name: 'Pro',
    description: 'Advanced features for growing businesses',
    price: 29,
    interval: 'monthly',
    maxUsers: 25,
    maxProducts: 1000,
    maxSalesPerMonth: 5000,
    stripePriceId: 'price_1RxCZNCXIhVW50Le2KlkYQIY',
    isActive: true,
    analyticsEnabled: true,
    advancedReports: true,
    prioritySupport: true,
    customBranding: false,
    apiAccess: true,
    bulkOperations: true,
    dataExport: true,
    customFields: true,
    advancedSecurity: false,
    whiteLabel: false,
    dedicatedSupport: false,
    ssoEnabled: false,
    auditLogs: false,
    backupRestore: false,
    customIntegrations: false,
  },
  {
    name: 'Premium',
    description: 'Enterprise-grade solution with all features',
    price: 99,
    interval: 'monthly',
    maxUsers: null, // unlimited
    maxProducts: null, // unlimited
    maxSalesPerMonth: null, // unlimited
    stripePriceId: 'price_1RxCZvCXIhVW50LeIZO9GzaE',
    isActive: true,
    analyticsEnabled: true,
    advancedReports: true,
    prioritySupport: true,
    customBranding: true,
    apiAccess: true,
    bulkOperations: true,
    dataExport: true,
    customFields: true,
    advancedSecurity: true,
    whiteLabel: true,
    dedicatedSupport: true,
    ssoEnabled: true,
    auditLogs: true,
    backupRestore: true,
    customIntegrations: true,
  },
];

async function seedPlans() {
  console.log('Seeding subscription plans...');

  for (const planData of plans) {
    const existingPlan = await prisma.plan.findFirst({
      where: { name: planData.name },
    });

    if (!existingPlan) {
      await prisma.plan.create({
        data: planData as any, // Use type assertion to bypass strict typing
      });
      console.log(`Created plan: ${planData.name}`);
    } else {
      console.log(`Plan ${planData.name} already exists, updating...`);
      await prisma.plan.update({
        where: { id: existingPlan.id },
        data: planData as any,
      });
    }
  }

  console.log('Plans seeding complete.');
  await prisma.$disconnect();
}

// For standalone execution
if (require.main === module) {
  seedPlans()
    .catch(e => { console.error(e); process.exit(1); });
}

export { seedPlans };
