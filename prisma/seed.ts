import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // First, delete all existing data to avoid conflicts
  await prisma.planFeatureOnPlan.deleteMany({});
  await prisma.planFeature.deleteMany({});
  await prisma.plan.deleteMany({});

  // Create features
  const features = {
    basic: await prisma.planFeature.create({
      data: {
        id: 'basic_features',
        featureKey: 'basic_features',
        featureName: 'Basic Features',
        featureDescription: 'Essential features for getting started',
        isEnabled: true,
      },
    }),
    bulkOps: await prisma.planFeature.create({
      data: {
        id: 'bulk_operations',
        featureKey: 'bulk_operations',
        featureName: 'Bulk Operations',
        featureDescription: 'Import/export data in bulk',
        isEnabled: true,
      },
    }),
    basicReports: await prisma.planFeature.create({
      data: {
        id: 'basic_reports',
        featureKey: 'basic_reports',
        featureName: 'Basic Reports',
        featureDescription: 'Essential business insights',
        isEnabled: true,
      },
    }),
    advancedReports: await prisma.planFeature.create({
      data: {
        id: 'advanced_reports',
        featureKey: 'advanced_reports',
        featureName: 'Advanced Reports',
        featureDescription: 'Detailed business analytics',
        isEnabled: true,
      },
    }),
    dataExport: await prisma.planFeature.create({
      data: {
        id: 'data_export',
        featureKey: 'data_export',
        featureName: 'Data Export',
        featureDescription: 'Export data in multiple formats',
        isEnabled: true,
      },
    }),
    customFields: await prisma.planFeature.create({
      data: {
        id: 'custom_fields',
        featureKey: 'custom_fields',
        featureName: 'Custom Fields',
        featureDescription: 'Add custom fields to products and sales',
        isEnabled: true,
      },
    }),
    apiAccess: await prisma.planFeature.create({
      data: {
        id: 'api_access',
        featureKey: 'api_access',
        featureName: 'API Access',
        featureDescription: 'Full API access for integrations',
        isEnabled: true,
      },
    }),
    customBranding: await prisma.planFeature.create({
      data: {
        id: 'custom_branding',
        featureKey: 'custom_branding',
        featureName: 'Custom Branding',
        featureDescription: 'White-label and custom branding',
        isEnabled: true,
      },
    }),
    whiteLabel: await prisma.planFeature.create({
      data: {
        id: 'white_label',
        featureKey: 'white_label',
        featureName: 'White Label',
        featureDescription: 'Remove all branding',
        isEnabled: true,
      },
    }),
    dedicatedSupport: await prisma.planFeature.create({
      data: {
        id: 'dedicated_support',
        featureKey: 'dedicated_support',
        featureName: 'Dedicated Support',
        featureDescription: '24/7 priority support',
        isEnabled: true,
      },
    }),
  };

  // Create plans with features
  const basicPlan = await prisma.plan.create({
    data: {
      id: 'basic_plan',
      name: 'Basic',
      description: 'Perfect for small businesses getting started',
      price: 0,
      interval: 'month',
      isActive: true,
      maxUsers: 5,
      maxProducts: 50,
      maxSalesPerMonth: 1000,
      features: {
        create: [
          { featureId: features.basic.id },
          { featureId: features.bulkOps.id },
          { featureId: features.basicReports.id },
        ],
      },
    },
  });

  const proPlan = await prisma.plan.create({
    data: {
      id: 'pro_plan',
      name: 'Pro',
      description: 'For growing businesses with advanced needs',
      price: 29,
      interval: 'month',
      isActive: true,
      maxUsers: 25,
      maxProducts: 500,
      maxSalesPerMonth: 10000,
      features: {
        create: [
          { featureId: features.basic.id },
          { featureId: features.bulkOps.id },
          { featureId: features.basicReports.id },
          { featureId: features.advancedReports.id },
          { featureId: features.dataExport.id },
          { featureId: features.customFields.id },
        ],
      },
    },
  });

  const enterprisePlan = await prisma.plan.create({
    data: {
      id: 'enterprise_plan',
      name: 'Enterprise',
      description: 'For large businesses with custom requirements',
      price: 99,
      interval: 'month',
      isActive: true,
      maxUsers: null, // Unlimited
      maxProducts: null, // Unlimited
      maxSalesPerMonth: null, // Unlimited
      features: {
        create: Object.values(features).map(feature => ({
          featureId: feature.id
        })),
      },
    },
  });

  console.log('Successfully seeded plans and features');
  console.log('- Basic Plan:', basicPlan.name);
  console.log('- Pro Plan:', proPlan.name);
  console.log('- Enterprise Plan:', enterprisePlan.name);
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });