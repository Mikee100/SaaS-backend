import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const permissions = [
    { key: 'view_sales', description: 'View sales' },
    { key: 'edit_sales', description: 'Edit sales' },
    { key: 'view_products', description: 'View products' },
    { key: 'edit_products', description: 'Edit products' },
    { key: 'manage_users', description: 'Manage users' },
    { key: 'manage_settings', description: 'Manage settings' },
    { key: 'view_reports', description: 'View reports' },
    { key: 'edit_inventory', description: 'Edit inventory' },
  ];
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: {},
      create: perm,
    });
  }
  console.log('Permissions seeded');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect()); 