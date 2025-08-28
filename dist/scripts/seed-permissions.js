"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const permissions = [
    { name: 'view_users', description: 'View users' },
    { name: 'edit_users', description: 'Edit users' },
    { name: 'delete_users', description: 'Delete users' },
    { name: 'view_roles', description: 'View roles' },
    { name: 'edit_roles', description: 'Edit roles' },
    { name: 'delete_roles', description: 'Delete roles' },
    { name: 'view_sales', description: 'View sales' },
    { name: 'create_sales', description: 'Create sales' },
    { name: 'edit_sales', description: 'Edit sales' },
    { name: 'delete_sales', description: 'Delete sales' },
    { name: 'view_inventory', description: 'View inventory' },
    { name: 'edit_inventory', description: 'Edit inventory' },
    { name: 'delete_inventory', description: 'Delete inventory' },
    { name: 'view_products', description: 'View products' },
    { name: 'edit_products', description: 'Edit products' },
    { name: 'delete_products', description: 'Delete products' },
    { name: 'view_analytics', description: 'View analytics' },
    { name: 'export_data', description: 'Export data' },
    { name: 'view_settings', description: 'View settings' },
    { name: 'edit_settings', description: 'Edit settings' },
    { name: 'view_billing', description: 'View billing' },
    { name: 'edit_billing', description: 'Edit billing' }
];
async function seedPermissions() {
    for (const perm of permissions) {
        const exists = await prisma.permission.findUnique({ where: { name: perm.name } });
        if (!exists) {
            await prisma.permission.create({ data: perm });
            console.log(`Created permission: ${perm.name}`);
        }
        else {
            console.log(`Permission already exists: ${perm.name}`);
        }
    }
    console.log('Permission seeding complete.');
}
seedPermissions()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed-permissions.js.map