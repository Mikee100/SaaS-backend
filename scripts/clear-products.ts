import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearProducts() {
  try {
    console.log('Clearing all products...');

    // Delete related records first due to foreign key constraints
    await prisma.saleItem.deleteMany({});
    await prisma.inventoryMovement.deleteMany({});
    await prisma.inventoryAlert.deleteMany({});
    await prisma.inventory.deleteMany({});

    // Delete products
    const result = await prisma.product.deleteMany({});

    console.log(`Successfully deleted ${result.count} products and related records.`);
  } catch (error) {
    console.error('Error clearing products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearProducts();
