"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function safeDeleteMany(model) {
    try {
        await model.deleteMany({});
    }
    catch (error) {
        if (error.code !== 'P2021') {
            throw error;
        }
        console.log(`Table for ${model.name} does not exist, skipping delete`);
    }
}
async function main() {
    console.log('Seeding database...');
    await safeDeleteMany(prisma.planFeatureOnPlan);
    await safeDeleteMany(prisma.planFeature);
    await safeDeleteMany(prisma.plan);
    await safeDeleteMany(prisma.userRole);
    await safeDeleteMany(prisma.rolePermission);
    await safeDeleteMany(prisma.role);
    await safeDeleteMany(prisma.permission);
    console.log('Creating default roles...');
    const defaultRoles = [
        {
            id: 'owner_role',
            name: 'owner',
            description: 'Owner with full access to all features and settings',
        },
        {
            id: 'admin_role',
            name: 'admin',
            description: 'Administrator with full access to all features',
        },
        {
            id: 'manager_role',
            name: 'manager',
            description: 'Manager with access to most features',
        },
        {
            id: 'staff_role',
            name: 'staff',
            description: 'Regular staff with limited access',
        },
        {
            id: 'viewer_role',
            name: 'viewer',
            description: 'View-only access to reports and data',
        },
        {
            id: 'cashier_role',
            name: 'cashier',
            description: 'Cashier with access to sales and transactions',
        },
    ];
    for (const roleData of defaultRoles) {
        await prisma.role.upsert({
            where: { id: roleData.id },
            update: {},
            create: {
                id: roleData.id,
                name: roleData.name,
                description: roleData.description,
            },
        });
        console.log(`Created/Updated role: ${roleData.name}`);
    }
    const allPermissions = [
        'view_users', 'edit_users', 'delete_users',
        'view_roles', 'edit_roles', 'delete_roles',
        'view_sales', 'create_sales', 'edit_sales', 'delete_sales',
        'view_inventory', 'edit_inventory', 'delete_inventory',
        'view_products', 'edit_products', 'delete_products',
        'view_analytics', 'export_data',
        'view_settings', 'edit_settings',
        'view_billing', 'edit_billing'
    ];
    for (const permissionName of allPermissions) {
        await prisma.permission.upsert({
            where: { name: permissionName },
            update: {},
            create: {
                name: permissionName,
                description: `Permission to ${permissionName.replace(/_/g, ' ')}`,
            },
        });
    }
    const rolePermissions = {
        owner_role: allPermissions,
        admin_role: allPermissions,
        manager_role: [
            'view_users', 'edit_users',
            'view_roles', 'edit_roles',
            'view_sales', 'create_sales', 'edit_sales',
            'view_inventory', 'edit_inventory',
            'view_products', 'edit_products',
            'view_analytics', 'export_data',
            'view_settings', 'edit_settings',
            'view_billing', 'edit_billing'
        ],
        staff_role: [
            'view_sales', 'create_sales',
            'view_inventory',
            'view_products',
        ],
        viewer_role: [
            'view_sales', 'view_inventory', 'view_products', 'view_analytics', 'view_settings', 'view_billing'
        ],
        cashier_role: [
            'view_sales', 'create_sales', 'view_products'
        ]
    };
    for (const [roleId, permissions] of Object.entries(rolePermissions)) {
        for (const permissionName of permissions) {
            const permission = await prisma.permission.upsert({
                where: { name: permissionName },
                update: {},
                create: {
                    name: permissionName,
                    description: `Permission to ${permissionName.replace(/_/g, ' ')}`,
                },
            });
            const existingPermission = await prisma.rolePermission.findFirst({
                where: {
                    roleId: roleId,
                    permissionId: permission.id,
                },
            });
            if (!existingPermission) {
                await prisma.rolePermission.create({
                    data: {
                        role: { connect: { id: roleId } },
                        permission: { connect: { id: permission.id } },
                    },
                });
            }
        }
        console.log(`Added permissions to role: ${roleId}`);
    }
    const features = {
        basic: await prisma.planFeature.upsert({
            where: { id: 'basic_features' },
            update: {},
            create: {
                id: 'basic_features',
                featureKey: 'basic_features',
                featureName: 'Basic Features',
                featureDescription: 'Essential features for getting started',
                isEnabled: true,
            },
        }),
        bulkOps: await prisma.planFeature.upsert({
            where: { id: 'bulk_operations' },
            update: {},
            create: {
                id: 'bulk_operations',
                featureKey: 'bulk_operations',
                featureName: 'Bulk Operations',
                featureDescription: 'Import/export data in bulk',
                isEnabled: true,
            },
        }),
        basicReports: await prisma.planFeature.upsert({
            where: { id: 'basic_reports' },
            update: {},
            create: {
                id: 'basic_reports',
                featureKey: 'basic_reports',
                featureName: 'Basic Reports',
                featureDescription: 'Essential business insights',
                isEnabled: true,
            },
        }),
        advancedReports: await prisma.planFeature.upsert({
            where: { id: 'advanced_reports' },
            update: {},
            create: {
                id: 'advanced_reports',
                featureKey: 'advanced_reports',
                featureName: 'Advanced Reports',
                featureDescription: 'Detailed business analytics',
                isEnabled: true,
            },
        }),
        dataExport: await prisma.planFeature.upsert({
            where: { id: 'data_export' },
            update: {},
            create: {
                id: 'data_export',
                featureKey: 'data_export',
                featureName: 'Data Export',
                featureDescription: 'Export data in multiple formats',
                isEnabled: true,
            },
        }),
        customFields: await prisma.planFeature.upsert({
            where: { id: 'custom_fields' },
            update: {},
            create: {
                id: 'custom_fields',
                featureKey: 'custom_fields',
                featureName: 'Custom Fields',
                featureDescription: 'Add custom fields to products and sales',
                isEnabled: true,
            },
        }),
        apiAccess: await prisma.planFeature.upsert({
            where: { id: 'api_access' },
            update: {},
            create: {
                id: 'api_access',
                featureKey: 'api_access',
                featureName: 'API Access',
                featureDescription: 'Full API access for integrations',
                isEnabled: true,
            },
        }),
        customBranding: await prisma.planFeature.upsert({
            where: { id: 'custom_branding' },
            update: {},
            create: {
                id: 'custom_branding',
                featureKey: 'custom_branding',
                featureName: 'Custom Branding',
                featureDescription: 'White-label and custom branding',
                isEnabled: true,
            },
        }),
        whiteLabel: await prisma.planFeature.upsert({
            where: { id: 'white_label' },
            update: {},
            create: {
                id: 'white_label',
                featureKey: 'white_label',
                featureName: 'White Label',
                featureDescription: 'Remove all branding',
                isEnabled: true,
            },
        }),
        dedicatedSupport: await prisma.planFeature.upsert({
            where: { id: 'dedicated_support' },
            update: {},
            create: {
                id: 'dedicated_support',
                featureKey: 'dedicated_support',
                featureName: 'Dedicated Support',
                featureDescription: '24/7 priority support',
                isEnabled: true,
            },
        }),
    };
    const basicPlan = await prisma.plan.upsert({
        where: { id: 'basic_plan' },
        update: {},
        create: {
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
    const proPlan = await prisma.plan.upsert({
        where: { id: 'pro_plan' },
        update: {},
        create: {
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
    const enterprisePlan = await prisma.plan.upsert({
        where: { id: 'enterprise_plan' },
        update: {},
        create: {
            id: 'enterprise_plan',
            name: 'Enterprise',
            description: 'For large businesses with custom requirements',
            price: 99,
            interval: 'month',
            isActive: true,
            maxUsers: null,
            maxProducts: null,
            maxSalesPerMonth: null,
            features: {
                create: Object.values(features).map(feature => ({
                    featureId: feature.id
                })),
            },
        },
    });
    console.log('Seeding completed successfully!');
    console.log({
        basicPlan: basicPlan.id,
        proPlan: proPlan.id,
        enterprisePlan: enterprisePlan.id,
    });
}
main()
    .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map