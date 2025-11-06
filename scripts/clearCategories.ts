import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearCategories() {
  try {
    console.log('Clearing all categories...');
    const result = await prisma.category.deleteMany({});
    console.log(`Deleted ${result.count} categories`);
  } catch (error) {
    console.error('Error clearing categories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearCategories();
