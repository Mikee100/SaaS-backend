import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultRoles = [
  { name: 'cashier', description: 'Cashier role for handling sales transactions' },
  { name: 'manager', description: 'Manager role with supervisory permissions' },
  { name: 'chef', description: 'Chef role for kitchen operations' },
];

async function seedDefaultRoles() {
  // Get all tenants
  const tenants = await prisma.tenant.findMany();

  for (const tenant of tenants) {
    console.log(`Seeding default roles for tenant: ${tenant.name} (${tenant.id})`);

    for (const roleData of defaultRoles) {
      const existingRole = await prisma.role.findFirst({
        where: {
          name: roleData.name,
          tenantId: tenant.id,
        },
      });

      if (!existingRole) {
        await prisma.role.create({
          data: {
            name: roleData.name,
            description: roleData.description,
            tenantId: tenant.id,
          },
        });
        console.log(`Created role: ${roleData.name} for tenant ${tenant.name}`);
      } else {
        console.log(`Role ${roleData.name} already exists for tenant ${tenant.name}`);
      }
    }
  }

  console.log('Default roles seeding complete.');
  await prisma.$disconnect();
}

// For standalone execution
if (require.main === module) {
  seedDefaultRoles()
    .catch(e => { console.error(e); process.exit(1); });
}

export { seedDefaultRoles };
