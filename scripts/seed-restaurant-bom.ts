import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

type IngredientSeed = {
  key: string;
  name: string;
  sku: string;
  cost: number;
  unit: string;
};

type RecipeLineSeed = {
  ingredientKey: string;
  quantity: number;
  unit: string;
  wastePercent?: number;
};

type RecipeSeed = {
  productName: string;
  yieldQty: number;
  yieldUnit: string;
  lines: RecipeLineSeed[];
};

const prisma = new PrismaClient();

const TARGET_TENANT = {
  name: process.env.BOM_TENANT_NAME || 'Damian Ltd',
  email: process.env.BOM_TENANT_EMAIL || 'damian@gmail.com',
};

const INGREDIENTS: IngredientSeed[] = [
  { key: 'goat_meat_kg', name: 'Goat Meat (Raw) 1kg', sku: 'ING-GOAT-001', cost: 650, unit: 'kg' },
  { key: 'beef_kg', name: 'Beef (Raw) 1kg', sku: 'ING-BEEF-001', cost: 620, unit: 'kg' },
  { key: 'chicken_kg', name: 'Chicken (Raw) 1kg', sku: 'ING-CHK-001', cost: 520, unit: 'kg' },
  { key: 'tilapia_whole', name: 'Tilapia (Whole) 1pc', sku: 'ING-TLP-001', cost: 320, unit: 'pc' },
  { key: 'rice_kg', name: 'Rice 1kg', sku: 'ING-RICE-001', cost: 210, unit: 'kg' },
  { key: 'burger_bun', name: 'Burger Bun 1pc', sku: 'ING-BUN-001', cost: 35, unit: 'pc' },
  { key: 'potato_kg', name: 'Potatoes 1kg', sku: 'ING-POT-001', cost: 120, unit: 'kg' },
  { key: 'chapati_pc', name: 'Chapati 1pc', sku: 'ING-CHP-001', cost: 25, unit: 'pc' },
  { key: 'veg_mix_kg', name: 'Vegetable Mix 1kg', sku: 'ING-VEG-001', cost: 180, unit: 'kg' },
  { key: 'kachumbari_kg', name: 'Kachumbari Mix 1kg', sku: 'ING-KCH-001', cost: 150, unit: 'kg' },
  { key: 'spice_mix_kg', name: 'Spice Mix 1kg', sku: 'ING-SPC-001', cost: 400, unit: 'kg' },
  { key: 'cooking_oil_l', name: 'Cooking Oil 1L', sku: 'ING-OIL-001', cost: 280, unit: 'L' },
  { key: 'soft_drink_unit', name: 'Soft Drink Unit', sku: 'ING-SODA-001', cost: 90, unit: 'unit' },
  { key: 'water_unit', name: 'Bottled Water Unit', sku: 'ING-WTR-001', cost: 50, unit: 'unit' },
  { key: 'juice_base_unit', name: 'Fresh Juice Base Unit', sku: 'ING-JCE-001', cost: 140, unit: 'unit' },
  { key: 'dessert_base_unit', name: 'Dessert Base Unit', sku: 'ING-DES-001', cost: 180, unit: 'unit' },
  { key: 'alcohol_unit', name: 'Alcohol Beverage Unit', sku: 'ING-ALC-001', cost: 230, unit: 'unit' },
];

const RECIPE_SEEDS: RecipeSeed[] = [
  {
    productName: 'Nyama Choma Platter',
    yieldQty: 1,
    yieldUnit: 'plate',
    lines: [
      { ingredientKey: 'goat_meat_kg', quantity: 0.45, unit: 'kg', wastePercent: 6 },
      { ingredientKey: 'kachumbari_kg', quantity: 0.12, unit: 'kg' },
      { ingredientKey: 'spice_mix_kg', quantity: 0.02, unit: 'kg' },
      { ingredientKey: 'cooking_oil_l', quantity: 0.03, unit: 'L' },
    ],
  },
  {
    productName: 'Chicken Biryani',
    yieldQty: 1,
    yieldUnit: 'plate',
    lines: [
      { ingredientKey: 'chicken_kg', quantity: 0.28, unit: 'kg', wastePercent: 5 },
      { ingredientKey: 'rice_kg', quantity: 0.20, unit: 'kg' },
      { ingredientKey: 'spice_mix_kg', quantity: 0.02, unit: 'kg' },
      { ingredientKey: 'cooking_oil_l', quantity: 0.02, unit: 'L' },
    ],
  },
  {
    productName: 'Beef Pilau',
    yieldQty: 1,
    yieldUnit: 'plate',
    lines: [
      { ingredientKey: 'beef_kg', quantity: 0.22, unit: 'kg', wastePercent: 4 },
      { ingredientKey: 'rice_kg', quantity: 0.18, unit: 'kg' },
      { ingredientKey: 'spice_mix_kg', quantity: 0.018, unit: 'kg' },
      { ingredientKey: 'cooking_oil_l', quantity: 0.018, unit: 'L' },
    ],
  },
  {
    productName: 'Grilled Tilapia with Ugali',
    yieldQty: 1,
    yieldUnit: 'plate',
    lines: [
      { ingredientKey: 'tilapia_whole', quantity: 1, unit: 'pc', wastePercent: 3 },
      { ingredientKey: 'kachumbari_kg', quantity: 0.10, unit: 'kg' },
      { ingredientKey: 'spice_mix_kg', quantity: 0.014, unit: 'kg' },
      { ingredientKey: 'cooking_oil_l', quantity: 0.02, unit: 'L' },
    ],
  },
  {
    productName: 'Chicken Burger with Fries',
    yieldQty: 1,
    yieldUnit: 'plate',
    lines: [
      { ingredientKey: 'burger_bun', quantity: 1, unit: 'pc' },
      { ingredientKey: 'chicken_kg', quantity: 0.16, unit: 'kg', wastePercent: 4 },
      { ingredientKey: 'potato_kg', quantity: 0.20, unit: 'kg' },
      { ingredientKey: 'spice_mix_kg', quantity: 0.01, unit: 'kg' },
      { ingredientKey: 'cooking_oil_l', quantity: 0.03, unit: 'L' },
    ],
  },
  {
    productName: 'Chapati Beef Stew Combo',
    yieldQty: 1,
    yieldUnit: 'plate',
    lines: [
      { ingredientKey: 'chapati_pc', quantity: 2, unit: 'pc' },
      { ingredientKey: 'beef_kg', quantity: 0.20, unit: 'kg', wastePercent: 4 },
      { ingredientKey: 'spice_mix_kg', quantity: 0.012, unit: 'kg' },
      { ingredientKey: 'cooking_oil_l', quantity: 0.018, unit: 'L' },
    ],
  },
  {
    productName: 'Vegetable Stir Fry Rice',
    yieldQty: 1,
    yieldUnit: 'plate',
    lines: [
      { ingredientKey: 'veg_mix_kg', quantity: 0.22, unit: 'kg', wastePercent: 3 },
      { ingredientKey: 'rice_kg', quantity: 0.18, unit: 'kg' },
      { ingredientKey: 'spice_mix_kg', quantity: 0.012, unit: 'kg' },
      { ingredientKey: 'cooking_oil_l', quantity: 0.016, unit: 'L' },
    ],
  },
  {
    productName: 'Goat Fry with Kachumbari',
    yieldQty: 1,
    yieldUnit: 'plate',
    lines: [
      { ingredientKey: 'goat_meat_kg', quantity: 0.42, unit: 'kg', wastePercent: 6 },
      { ingredientKey: 'kachumbari_kg', quantity: 0.13, unit: 'kg' },
      { ingredientKey: 'spice_mix_kg', quantity: 0.018, unit: 'kg' },
      { ingredientKey: 'cooking_oil_l', quantity: 0.03, unit: 'L' },
    ],
  },
  {
    productName: 'Coca-Cola 300ml',
    yieldQty: 1,
    yieldUnit: 'serving',
    lines: [{ ingredientKey: 'soft_drink_unit', quantity: 1, unit: 'unit' }],
  },
  {
    productName: 'Fanta Orange 300ml',
    yieldQty: 1,
    yieldUnit: 'serving',
    lines: [{ ingredientKey: 'soft_drink_unit', quantity: 1, unit: 'unit' }],
  },
  {
    productName: 'Sprite 300ml',
    yieldQty: 1,
    yieldUnit: 'serving',
    lines: [{ ingredientKey: 'soft_drink_unit', quantity: 1, unit: 'unit' }],
  },
  {
    productName: 'Minute Maid Mango',
    yieldQty: 1,
    yieldUnit: 'serving',
    lines: [{ ingredientKey: 'juice_base_unit', quantity: 1, unit: 'unit' }],
  },
  {
    productName: 'Fresh Passion Juice',
    yieldQty: 1,
    yieldUnit: 'serving',
    lines: [{ ingredientKey: 'juice_base_unit', quantity: 1, unit: 'unit' }],
  },
  {
    productName: 'Sparkling Water 500ml',
    yieldQty: 1,
    yieldUnit: 'serving',
    lines: [{ ingredientKey: 'water_unit', quantity: 1, unit: 'unit' }],
  },
  {
    productName: 'Mineral Water 500ml',
    yieldQty: 1,
    yieldUnit: 'serving',
    lines: [{ ingredientKey: 'water_unit', quantity: 1, unit: 'unit' }],
  },
  {
    productName: 'Iced Lemon Tea',
    yieldQty: 1,
    yieldUnit: 'serving',
    lines: [{ ingredientKey: 'juice_base_unit', quantity: 1, unit: 'unit' }],
  },
  {
    productName: 'Tusker Lager',
    yieldQty: 1,
    yieldUnit: 'serving',
    lines: [{ ingredientKey: 'alcohol_unit', quantity: 1, unit: 'unit' }],
  },
  {
    productName: 'Guinness Pint',
    yieldQty: 1,
    yieldUnit: 'serving',
    lines: [{ ingredientKey: 'alcohol_unit', quantity: 1, unit: 'unit' }],
  },
  {
    productName: 'Smirnoff Vodka Shot',
    yieldQty: 1,
    yieldUnit: 'serving',
    lines: [{ ingredientKey: 'alcohol_unit', quantity: 1, unit: 'unit' }],
  },
  {
    productName: 'Captain Morgan Rum Shot',
    yieldQty: 1,
    yieldUnit: 'serving',
    lines: [{ ingredientKey: 'alcohol_unit', quantity: 1, unit: 'unit' }],
  },
  {
    productName: 'Gilbeys Gin Shot',
    yieldQty: 1,
    yieldUnit: 'serving',
    lines: [{ ingredientKey: 'alcohol_unit', quantity: 1, unit: 'unit' }],
  },
  {
    productName: 'Jagermeister Shot',
    yieldQty: 1,
    yieldUnit: 'serving',
    lines: [{ ingredientKey: 'alcohol_unit', quantity: 1, unit: 'unit' }],
  },
  {
    productName: 'House Whisky Single',
    yieldQty: 1,
    yieldUnit: 'serving',
    lines: [{ ingredientKey: 'alcohol_unit', quantity: 1, unit: 'unit' }],
  },
  {
    productName: 'Savanna Dry Cider',
    yieldQty: 1,
    yieldUnit: 'serving',
    lines: [{ ingredientKey: 'alcohol_unit', quantity: 1, unit: 'unit' }],
  },
  {
    productName: 'Chocolate Fudge Cake Slice',
    yieldQty: 1,
    yieldUnit: 'serving',
    lines: [{ ingredientKey: 'dessert_base_unit', quantity: 1, unit: 'unit' }],
  },
  {
    productName: 'Vanilla Ice Cream Bowl',
    yieldQty: 1,
    yieldUnit: 'serving',
    lines: [{ ingredientKey: 'dessert_base_unit', quantity: 1, unit: 'unit' }],
  },
  {
    productName: 'Strawberry Cheesecake Slice',
    yieldQty: 1,
    yieldUnit: 'serving',
    lines: [{ ingredientKey: 'dessert_base_unit', quantity: 1, unit: 'unit' }],
  },
  {
    productName: 'Caramel Pudding',
    yieldQty: 1,
    yieldUnit: 'serving',
    lines: [{ ingredientKey: 'dessert_base_unit', quantity: 1, unit: 'unit' }],
  },
  {
    productName: 'Fruit Salad Bowl',
    yieldQty: 1,
    yieldUnit: 'serving',
    lines: [{ ingredientKey: 'dessert_base_unit', quantity: 1, unit: 'unit' }],
  },
  {
    productName: 'Brownie with Ice Cream',
    yieldQty: 1,
    yieldUnit: 'serving',
    lines: [{ ingredientKey: 'dessert_base_unit', quantity: 1, unit: 'unit' }],
  },
  {
    productName: 'Tiramisu Cup',
    yieldQty: 1,
    yieldUnit: 'serving',
    lines: [{ ingredientKey: 'dessert_base_unit', quantity: 1, unit: 'unit' }],
  },
  {
    productName: 'Lemon Tart Slice',
    yieldQty: 1,
    yieldUnit: 'serving',
    lines: [{ ingredientKey: 'dessert_base_unit', quantity: 1, unit: 'unit' }],
  },
];

async function resolveTenant() {
  if (process.env.BOM_TENANT_ID) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: process.env.BOM_TENANT_ID },
      select: { id: true, name: true, contactEmail: true },
    });
    if (tenant) return tenant;
  }

  return prisma.tenant.findFirst({
    where: {
      OR: [{ contactEmail: TARGET_TENANT.email }, { name: TARGET_TENANT.name }],
      deletedAt: null,
    },
    select: { id: true, name: true, contactEmail: true },
  });
}

async function resolveBranch(tenantId: string) {
  if (process.env.BOM_BRANCH_ID) {
    const branch = await prisma.branch.findFirst({
      where: { id: process.env.BOM_BRANCH_ID, tenantId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (branch) return branch;
  }

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

async function ensureIngredientProducts(tenantId: string, branchId: string) {
  const ingredientIdByKey = new Map<string, string>();
  let created = 0;
  let updated = 0;

  for (const ingredient of INGREDIENTS) {
    const existing = await prisma.product.findFirst({
      where: {
        tenantId,
        sku: ingredient.sku,
      },
      select: { id: true },
    });

    const payload = {
      name: ingredient.name,
      sku: ingredient.sku,
      price: ingredient.cost,
      cost: ingredient.cost,
      stock: 100,
      images: [] as string[],
      tenantId,
      branchId,
      inventoryPolicy: 'TRACKED',
      unitAbbreviation: ingredient.unit,
      unitName: ingredient.unit,
      customFields: {
        category: 'Ingredients',
        isIngredient: true,
        bomSeed: true,
      },
      deletedAt: null,
    };

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: payload,
      });
      ingredientIdByKey.set(ingredient.key, existing.id);
      updated += 1;
    } else {
      const createdProduct = await prisma.product.create({
        data: {
          id: randomUUID(),
          ...payload,
        },
        select: { id: true },
      });
      ingredientIdByKey.set(ingredient.key, createdProduct.id);
      created += 1;
    }
  }

  return { ingredientIdByKey, created, updated };
}

async function seedBomRecipes(tenantId: string, branchId: string, ingredientIdByKey: Map<string, string>) {
  let recipesCreated = 0;
  let recipesUpdated = 0;
  let recipesSkipped = 0;

  for (const seed of RECIPE_SEEDS) {
    const product = await prisma.product.findFirst({
      where: {
        tenantId,
        branchId,
        name: seed.productName,
        deletedAt: null,
      },
      select: { id: true, name: true },
    });

    if (!product) {
      recipesSkipped += 1;
      continue;
    }

    const lines = seed.lines
      .map((line) => {
        const ingredientProductId = ingredientIdByKey.get(line.ingredientKey);
        if (!ingredientProductId) return null;
        return {
          ingredientProductId,
          quantity: line.quantity,
          unit: line.unit,
          wastePercent: line.wastePercent || 0,
        };
      })
      .filter((line): line is { ingredientProductId: string; quantity: number; unit: string; wastePercent: number } => Boolean(line));

    if (lines.length === 0) {
      recipesSkipped += 1;
      continue;
    }

    const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "BomRecipe" WHERE "tenantId" = $1 AND "branchId" = $2 AND "productId" = $3 AND "isActive" = true LIMIT 1`,
      tenantId,
      branchId,
      product.id,
    );

    if (existing.length === 0) {
      const recipeId = randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "BomRecipe" ("id", "tenantId", "branchId", "productId", "yieldQty", "yieldUnit", "version", "isActive", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, 1, true, NOW(), NOW())`,
        recipeId,
        tenantId,
        branchId,
        product.id,
        seed.yieldQty,
        seed.yieldUnit,
      );

      for (const line of lines) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "BomRecipeLine" ("id", "recipeId", "ingredientProductId", "quantity", "unit", "wastePercent", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          randomUUID(),
          recipeId,
          line.ingredientProductId,
          line.quantity,
          line.unit,
          line.wastePercent,
        );
      }

      recipesCreated += 1;
      continue;
    }

    const existingRecipeId = existing[0].id;
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `DELETE FROM "BomRecipeLine" WHERE "recipeId" = $1`,
        existingRecipeId,
      );

      await tx.$executeRawUnsafe(
        `UPDATE "BomRecipe" SET "yieldQty" = $1, "yieldUnit" = $2, "version" = "version" + 1, "updatedAt" = NOW() WHERE "id" = $3`,
        seed.yieldQty,
        seed.yieldUnit,
        existingRecipeId,
      );

      for (const line of lines) {
        await tx.$executeRawUnsafe(
          `INSERT INTO "BomRecipeLine" ("id", "recipeId", "ingredientProductId", "quantity", "unit", "wastePercent", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          randomUUID(),
          existingRecipeId,
          line.ingredientProductId,
          line.quantity,
          line.unit,
          line.wastePercent,
        );
      }
    });

    recipesUpdated += 1;
  }

  return { recipesCreated, recipesUpdated, recipesSkipped };
}

async function main() {
  console.log('🌱 Seeding restaurant BOM recipes...');

  const tenant = await resolveTenant();
  if (!tenant) {
    throw new Error(
      `Tenant not found. Set BOM_TENANT_ID or ensure tenant exists for email=${TARGET_TENANT.email} name=${TARGET_TENANT.name}`,
    );
  }

  const branch = await resolveBranch(tenant.id);
  if (!branch) {
    throw new Error(`No active branch found for tenant ${tenant.name}`);
  }

  const { ingredientIdByKey, created, updated } = await ensureIngredientProducts(tenant.id, branch.id);
  const result = await seedBomRecipes(tenant.id, branch.id, ingredientIdByKey);

  console.log(`✅ Tenant: ${tenant.name} (${tenant.contactEmail})`);
  console.log(`✅ Branch: ${branch.name}`);
  console.log(`✅ Ingredient products created: ${created}`);
  console.log(`✅ Ingredient products updated: ${updated}`);
  console.log(`✅ BOM recipes created: ${result.recipesCreated}`);
  console.log(`✅ BOM recipes updated: ${result.recipesUpdated}`);
  console.log(`⚠️ BOM recipes skipped (menu product missing): ${result.recipesSkipped}`);
  console.log('🎉 BOM seeding complete.');
}

main()
  .catch((error) => {
    console.error('❌ BOM seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
