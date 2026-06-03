import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

type SeedItem = {
  name: string;
  sku: string;
  price: number;
  cost: number;
};

const prisma = new PrismaClient();

const TARGET_TENANT = {
  name: 'Damian Ltd',
  email: 'damian@gmail.com',
  phone: '+254721840962',
};

const CATEGORY_ITEMS: Record<string, SeedItem[]> = {
  Bar: [
    { name: 'Tusker Lager', sku: 'DAM-BAR-001', price: 350, cost: 210 },
    { name: 'Guinness Pint', sku: 'DAM-BAR-002', price: 420, cost: 250 },
    { name: 'Smirnoff Vodka Shot', sku: 'DAM-BAR-003', price: 300, cost: 170 },
    { name: 'Captain Morgan Rum Shot', sku: 'DAM-BAR-004', price: 320, cost: 185 },
    { name: 'Gilbeys Gin Shot', sku: 'DAM-BAR-005', price: 280, cost: 160 },
    { name: 'Jagermeister Shot', sku: 'DAM-BAR-006', price: 420, cost: 260 },
    { name: 'House Whisky Single', sku: 'DAM-BAR-007', price: 450, cost: 280 },
    { name: 'Savanna Dry Cider', sku: 'DAM-BAR-008', price: 500, cost: 320 },
  ],
  Desserts: [
    { name: 'Chocolate Fudge Cake Slice', sku: 'DAM-DES-001', price: 450, cost: 220 },
    { name: 'Vanilla Ice Cream Bowl', sku: 'DAM-DES-002', price: 300, cost: 130 },
    { name: 'Strawberry Cheesecake Slice', sku: 'DAM-DES-003', price: 500, cost: 250 },
    { name: 'Caramel Pudding', sku: 'DAM-DES-004', price: 320, cost: 150 },
    { name: 'Fruit Salad Bowl', sku: 'DAM-DES-005', price: 350, cost: 180 },
    { name: 'Brownie with Ice Cream', sku: 'DAM-DES-006', price: 480, cost: 240 },
    { name: 'Tiramisu Cup', sku: 'DAM-DES-007', price: 520, cost: 270 },
    { name: 'Lemon Tart Slice', sku: 'DAM-DES-008', price: 430, cost: 210 },
  ],
  Drinks: [
    { name: 'Coca-Cola 300ml', sku: 'DAM-DRK-001', price: 180, cost: 90 },
    { name: 'Fanta Orange 300ml', sku: 'DAM-DRK-002', price: 180, cost: 90 },
    { name: 'Sprite 300ml', sku: 'DAM-DRK-003', price: 180, cost: 90 },
    { name: 'Minute Maid Mango', sku: 'DAM-DRK-004', price: 250, cost: 130 },
    { name: 'Fresh Passion Juice', sku: 'DAM-DRK-005', price: 300, cost: 150 },
    { name: 'Sparkling Water 500ml', sku: 'DAM-DRK-006', price: 220, cost: 110 },
    { name: 'Mineral Water 500ml', sku: 'DAM-DRK-007', price: 120, cost: 50 },
    { name: 'Iced Lemon Tea', sku: 'DAM-DRK-008', price: 280, cost: 140 },
  ],
  Meals: [
    { name: 'Nyama Choma Platter', sku: 'DAM-MEA-001', price: 1200, cost: 650 },
    { name: 'Chicken Biryani', sku: 'DAM-MEA-002', price: 950, cost: 520 },
    { name: 'Beef Pilau', sku: 'DAM-MEA-003', price: 800, cost: 430 },
    { name: 'Grilled Tilapia with Ugali', sku: 'DAM-MEA-004', price: 1100, cost: 600 },
    { name: 'Chicken Burger with Fries', sku: 'DAM-MEA-005', price: 900, cost: 480 },
    { name: 'Chapati Beef Stew Combo', sku: 'DAM-MEA-006', price: 750, cost: 390 },
    { name: 'Vegetable Stir Fry Rice', sku: 'DAM-MEA-007', price: 700, cost: 340 },
    { name: 'Goat Fry with Kachumbari', sku: 'DAM-MEA-008', price: 1300, cost: 730 },
  ],
};

async function resolveTenant() {
  return prisma.tenant.findFirst({
    where: {
      OR: [
        { contactEmail: TARGET_TENANT.email },
        { contactPhone: TARGET_TENANT.phone },
        { name: TARGET_TENANT.name },
      ],
      deletedAt: null,
    },
    select: { id: true, name: true, contactEmail: true, contactPhone: true },
  });
}

async function resolveBranch(tenantId: string) {
  const mainBranch = await prisma.branch.findFirst({
    where: { tenantId, deletedAt: null, isMainBranch: true },
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  });

  if (mainBranch) return mainBranch;

  return prisma.branch.findFirst({
    where: { tenantId, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  });
}

async function ensureCategoriesConfig(tenantId: string) {
  const key = 'PRODUCT_CATEGORIES';
  const configured = await prisma.tenantConfiguration.findUnique({
    where: { tenantId_key: { tenantId, key } },
    select: { value: true },
  });

  let parsed: Array<{ id: string; name: string; slug: string; isActive: boolean }> = [];
  if (configured?.value) {
    try {
      const candidate = JSON.parse(configured.value);
      if (Array.isArray(candidate)) {
        parsed = candidate
          .map((x) => ({
            id: String(x?.id || randomUUID()),
            name: String(x?.name || '').trim(),
            slug: String(x?.slug || '')
              .trim()
              .toLowerCase(),
            isActive: x?.isActive !== false,
          }))
          .filter((x) => !!x.name);
      }
    } catch {
      parsed = [];
    }
  }

  const normalizeSlug = (name: string) =>
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

  for (const categoryName of Object.keys(CATEGORY_ITEMS)) {
    const existing = parsed.find(
      (x) => x.name.toLowerCase() === categoryName.toLowerCase(),
    );
    if (existing) {
      existing.isActive = true;
      existing.slug = existing.slug || normalizeSlug(existing.name);
      continue;
    }

    parsed.push({
      id: randomUUID(),
      name: categoryName,
      slug: normalizeSlug(categoryName),
      isActive: true,
    });
  }

  await prisma.tenantConfiguration.upsert({
    where: { tenantId_key: { tenantId, key } },
    update: {
      value: JSON.stringify(parsed),
      category: 'general',
      description: 'Admin-managed product/menu categories',
      isEncrypted: false,
      isPublic: true,
      updatedAt: new Date(),
    },
    create: {
      id: `tenant_config_${tenantId}_${key}_${Date.now()}`,
      tenantId,
      key,
      value: JSON.stringify(parsed),
      category: 'general',
      description: 'Admin-managed product/menu categories',
      isEncrypted: false,
      isPublic: true,
      updatedAt: new Date(),
    },
  });
}

async function seedProducts(tenantId: string, branchId: string) {
  let created = 0;
  let updated = 0;

  for (const [category, items] of Object.entries(CATEGORY_ITEMS)) {
    for (const item of items) {
      const existing = await prisma.product.findFirst({
        where: {
          tenantId,
          sku: item.sku,
        },
        select: { id: true },
      });

      const data = {
        name: item.name,
        sku: item.sku,
        price: item.price,
        cost: item.cost,
        stock: 0,
        images: [] as string[],
        tenantId,
        branchId,
        inventoryPolicy: 'NON_TRACKED',
        customFields: {
          category,
          menuItem: true,
          seededForTenant: TARGET_TENANT.email,
        },
      };

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            ...data,
            deletedAt: null,
          },
        });
        updated += 1;
      } else {
        await prisma.product.create({
          data: {
            id: randomUUID(),
            ...data,
          },
        });
        created += 1;
      }
    }
  }

  return { created, updated };
}

async function main() {
  console.log('🌱 Seeding Damian Ltd restaurant menu products...');

  const tenant = await resolveTenant();
  if (!tenant) {
    throw new Error(
      `Tenant not found for email=${TARGET_TENANT.email}, phone=${TARGET_TENANT.phone}, name=${TARGET_TENANT.name}`,
    );
  }

  const branch = await resolveBranch(tenant.id);
  if (!branch) {
    throw new Error(`No active branch found for tenant ${tenant.name}`);
  }

  await ensureCategoriesConfig(tenant.id);
  const result = await seedProducts(tenant.id, branch.id);

  console.log(`✅ Tenant: ${tenant.name} (${tenant.contactEmail})`);
  console.log(`✅ Branch: ${branch.name}`);
  console.log(`✅ Categories seeded: ${Object.keys(CATEGORY_ITEMS).join(', ')}`);
  console.log(`✅ Products created: ${result.created}`);
  console.log(`✅ Products updated: ${result.updated}`);
  console.log('🎉 Done.');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
