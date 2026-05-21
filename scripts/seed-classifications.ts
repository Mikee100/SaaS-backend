/**
 * Seed script for Business Classifications and Measurement Units
 * Run: npx ts-node scripts/seed-classifications.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CLASSIFICATIONS = [
  {
    name: 'Butchery & Meat',
    slug: 'butchery',
    description: 'Meat, poultry, seafood and related products sold by weight',
    icon: '🥩',
    color: '#ef4444',
    units: [
      { name: 'Gram', abbreviation: 'g', type: 'weight', isBaseUnit: true, baseUnit: 'g', conversionFactor: 1, sortOrder: 0 },
      { name: 'Kilogram', abbreviation: 'kg', type: 'weight', isBaseUnit: false, baseUnit: 'g', conversionFactor: 1000, sortOrder: 1 },
      { name: 'Half Kilogram', abbreviation: '500g', type: 'weight', isBaseUnit: false, baseUnit: 'g', conversionFactor: 500, sortOrder: 2 },
      { name: 'Quarter Kilogram', abbreviation: '250g', type: 'weight', isBaseUnit: false, baseUnit: 'g', conversionFactor: 250, sortOrder: 3 },
      { name: 'Piece', abbreviation: 'pc', type: 'count', isBaseUnit: false, sortOrder: 4 },
    ],
  },
  {
    name: 'Dairy & Beverages',
    slug: 'dairy',
    description: 'Milk, juices, water and other liquid products sold by volume',
    icon: '🥛',
    color: '#3b82f6',
    units: [
      { name: 'Millilitre', abbreviation: 'ml', type: 'volume', isBaseUnit: true, baseUnit: 'ml', conversionFactor: 1, sortOrder: 0 },
      { name: 'Litre', abbreviation: 'L', type: 'volume', isBaseUnit: false, baseUnit: 'ml', conversionFactor: 1000, sortOrder: 1 },
      { name: 'Half Litre', abbreviation: '500ml', type: 'volume', isBaseUnit: false, baseUnit: 'ml', conversionFactor: 500, sortOrder: 2 },
      { name: 'Quarter Litre', abbreviation: '250ml', type: 'volume', isBaseUnit: false, baseUnit: 'ml', conversionFactor: 250, sortOrder: 3 },
      { name: 'Packet', abbreviation: 'pkt', type: 'count', isBaseUnit: false, sortOrder: 4 },
    ],
  },
  {
    name: 'Clothing & Apparel',
    slug: 'clothing',
    description: 'Clothes, shirts, trousers and garments sold by size',
    icon: '👕',
    color: '#8b5cf6',
    units: [
      { name: 'Extra Small', abbreviation: 'XS', type: 'size_clothing', isBaseUnit: false, sortOrder: 0 },
      { name: 'Small', abbreviation: 'S', type: 'size_clothing', isBaseUnit: false, sortOrder: 1 },
      { name: 'Medium', abbreviation: 'M', type: 'size_clothing', isBaseUnit: true, sortOrder: 2 },
      { name: 'Large', abbreviation: 'L', type: 'size_clothing', isBaseUnit: false, sortOrder: 3 },
      { name: 'Extra Large', abbreviation: 'XL', type: 'size_clothing', isBaseUnit: false, sortOrder: 4 },
      { name: 'Double Extra Large', abbreviation: 'XXL', type: 'size_clothing', isBaseUnit: false, sortOrder: 5 },
      { name: 'Triple Extra Large', abbreviation: 'XXXL', type: 'size_clothing', isBaseUnit: false, sortOrder: 6 },
      { name: 'Free Size', abbreviation: 'FREE', type: 'size_clothing', isBaseUnit: false, sortOrder: 7 },
    ],
  },
  {
    name: 'Footwear',
    slug: 'footwear',
    description: 'Shoes, boots, sandals and other footwear sold by shoe size',
    icon: '👟',
    color: '#f59e0b',
    units: [
      { name: 'Size 35', abbreviation: '35', type: 'size_footwear', isBaseUnit: false, sortOrder: 0 },
      { name: 'Size 36', abbreviation: '36', type: 'size_footwear', isBaseUnit: false, sortOrder: 1 },
      { name: 'Size 37', abbreviation: '37', type: 'size_footwear', isBaseUnit: false, sortOrder: 2 },
      { name: 'Size 38', abbreviation: '38', type: 'size_footwear', isBaseUnit: false, sortOrder: 3 },
      { name: 'Size 39', abbreviation: '39', type: 'size_footwear', isBaseUnit: false, sortOrder: 4 },
      { name: 'Size 40', abbreviation: '40', type: 'size_footwear', isBaseUnit: true, sortOrder: 5 },
      { name: 'Size 41', abbreviation: '41', type: 'size_footwear', isBaseUnit: false, sortOrder: 6 },
      { name: 'Size 42', abbreviation: '42', type: 'size_footwear', isBaseUnit: false, sortOrder: 7 },
      { name: 'Size 43', abbreviation: '43', type: 'size_footwear', isBaseUnit: false, sortOrder: 8 },
      { name: 'Size 44', abbreviation: '44', type: 'size_footwear', isBaseUnit: false, sortOrder: 9 },
      { name: 'Size 45', abbreviation: '45', type: 'size_footwear', isBaseUnit: false, sortOrder: 10 },
      { name: 'Size 46', abbreviation: '46', type: 'size_footwear', isBaseUnit: false, sortOrder: 11 },
    ],
  },
  {
    name: 'Electronics & Tech',
    slug: 'electronics',
    description: 'Phones, computers, accessories and electronics sold by unit',
    icon: '📱',
    color: '#06b6d4',
    units: [
      { name: 'Piece', abbreviation: 'pc', type: 'count', isBaseUnit: true, sortOrder: 0 },
      { name: 'Unit', abbreviation: 'unit', type: 'count', isBaseUnit: false, sortOrder: 1 },
      { name: 'Set', abbreviation: 'set', type: 'count', isBaseUnit: false, sortOrder: 2 },
      { name: 'Box', abbreviation: 'box', type: 'count', isBaseUnit: false, sortOrder: 3 },
    ],
  },
  {
    name: 'Pharmacy & Health',
    slug: 'pharmacy',
    description: 'Medicines, supplements and health products',
    icon: '💊',
    color: '#10b981',
    units: [
      { name: 'Tablet', abbreviation: 'tab', type: 'count', isBaseUnit: true, sortOrder: 0 },
      { name: 'Capsule', abbreviation: 'cap', type: 'count', isBaseUnit: false, sortOrder: 1 },
      { name: 'Milligram', abbreviation: 'mg', type: 'weight', isBaseUnit: false, baseUnit: 'g', conversionFactor: 0.001, sortOrder: 2 },
      { name: 'Gram', abbreviation: 'g', type: 'weight', isBaseUnit: false, baseUnit: 'g', conversionFactor: 1, sortOrder: 3 },
      { name: 'Millilitre', abbreviation: 'ml', type: 'volume', isBaseUnit: false, baseUnit: 'ml', conversionFactor: 1, sortOrder: 4 },
      { name: 'Vial', abbreviation: 'vial', type: 'count', isBaseUnit: false, sortOrder: 5 },
      { name: 'Strip', abbreviation: 'strip', type: 'count', isBaseUnit: false, sortOrder: 6 },
      { name: 'Sachet', abbreviation: 'sachet', type: 'count', isBaseUnit: false, sortOrder: 7 },
    ],
  },
  {
    name: 'Grocery & General',
    slug: 'grocery',
    description: 'Supermarkets, general stores with mixed product types',
    icon: '🛒',
    color: '#84cc16',
    units: [
      { name: 'Piece', abbreviation: 'pc', type: 'count', isBaseUnit: true, sortOrder: 0 },
      { name: 'Kilogram', abbreviation: 'kg', type: 'weight', isBaseUnit: false, baseUnit: 'g', conversionFactor: 1000, sortOrder: 1 },
      { name: 'Gram', abbreviation: 'g', type: 'weight', isBaseUnit: false, baseUnit: 'g', conversionFactor: 1, sortOrder: 2 },
      { name: 'Litre', abbreviation: 'L', type: 'volume', isBaseUnit: false, baseUnit: 'ml', conversionFactor: 1000, sortOrder: 3 },
      { name: 'Dozen', abbreviation: 'doz', type: 'count', isBaseUnit: false, sortOrder: 4 },
      { name: 'Packet', abbreviation: 'pkt', type: 'count', isBaseUnit: false, sortOrder: 5 },
      { name: 'Carton', abbreviation: 'ctn', type: 'count', isBaseUnit: false, sortOrder: 6 },
      { name: 'Bag', abbreviation: 'bag', type: 'count', isBaseUnit: false, sortOrder: 7 },
    ],
  },
  {
    name: 'Hardware & Tools',
    slug: 'hardware',
    description: 'Building materials, tools, pipes, wires and hardware products',
    icon: '🔧',
    color: '#6b7280',
    units: [
      { name: 'Piece', abbreviation: 'pc', type: 'count', isBaseUnit: true, sortOrder: 0 },
      { name: 'Metre', abbreviation: 'm', type: 'length', isBaseUnit: false, sortOrder: 1 },
      { name: 'Roll', abbreviation: 'roll', type: 'count', isBaseUnit: false, sortOrder: 2 },
      { name: 'Set', abbreviation: 'set', type: 'count', isBaseUnit: false, sortOrder: 3 },
      { name: 'Litre', abbreviation: 'L', type: 'volume', isBaseUnit: false, sortOrder: 4 },
      { name: 'Kilogram', abbreviation: 'kg', type: 'weight', isBaseUnit: false, sortOrder: 5 },
      { name: 'Bag (50kg)', abbreviation: 'bag', type: 'count', isBaseUnit: false, sortOrder: 6 },
    ],
  },
  {
    name: 'Furniture & Home',
    slug: 'furniture',
    description: 'Furniture, home appliances and household goods',
    icon: '🛋️',
    color: '#d97706',
    units: [
      { name: 'Piece', abbreviation: 'pc', type: 'count', isBaseUnit: true, sortOrder: 0 },
      { name: 'Set', abbreviation: 'set', type: 'count', isBaseUnit: false, sortOrder: 1 },
      { name: 'Pair', abbreviation: 'pair', type: 'count', isBaseUnit: false, sortOrder: 2 },
    ],
  },
  {
    name: 'General / Custom',
    slug: 'general',
    description: 'Businesses that don\'t fit specific categories or use custom units',
    icon: '🏪',
    color: '#64748b',
    units: [
      { name: 'Unit', abbreviation: 'unit', type: 'count', isBaseUnit: true, sortOrder: 0 },
      { name: 'Piece', abbreviation: 'pc', type: 'count', isBaseUnit: false, sortOrder: 1 },
      { name: 'Kilogram', abbreviation: 'kg', type: 'weight', isBaseUnit: false, sortOrder: 2 },
      { name: 'Litre', abbreviation: 'L', type: 'volume', isBaseUnit: false, sortOrder: 3 },
      { name: 'Box', abbreviation: 'box', type: 'count', isBaseUnit: false, sortOrder: 4 },
    ],
  },
];

async function main() {
  console.log('🌱 Seeding Business Classifications & Measurement Units...\n');

  for (const c of CLASSIFICATIONS) {
    const { units, ...classData } = c;

    // Upsert classification
    const classification = await prisma.businessClassification.upsert({
      where: { slug: classData.slug },
      update: { name: classData.name, description: classData.description, icon: classData.icon, color: classData.color },
      create: { ...classData, isSystem: true, isActive: true },
    });

    console.log(`✅ ${classification.name} (${classification.slug})`);

    // Upsert each unit
    for (const u of units) {
      await prisma.measurementUnit.upsert({
        where: { classificationId_abbreviation: { classificationId: classification.id, abbreviation: u.abbreviation } },
        update: { name: u.name, type: u.type, isBaseUnit: u.isBaseUnit, sortOrder: u.sortOrder },
        create: { ...u, classificationId: classification.id, isActive: true },
      });
      process.stdout.write(`   + ${u.name} (${u.abbreviation})\n`);
    }
  }

  // Assign "General / Custom" to all existing tenants that have no classification
  const general = await prisma.businessClassification.findUnique({ where: { slug: 'general' } });
  if (general) {
    const updated = await prisma.tenant.updateMany({
      where: { classificationId: null },
      data: {
        classificationId: general.id,
        classificationAssigned: false, // Mark as not yet officially assigned → will prompt admin
        measurementPreferences: { defaultUnit: 'unit', allowedUnits: ['unit', 'pc', 'kg', 'L', 'box'] },
      },
    });
    console.log(`\n📌 Assigned 'general' to ${updated.count} existing tenant(s) without a classification.`);
  }

  console.log('\n🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
