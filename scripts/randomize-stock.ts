import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const products = await prisma.product.findMany();
    for (const product of products) {
      const randomStock = Math.floor(Math.random() * 100);
      const existing = await prisma.inventory.findFirst({ where: { productId: product.id } });
      if (existing) {
        await prisma.inventory.update({
          where: { id: existing.id },
          data: { quantity: randomStock },
        });
      } else {
        const now = new Date();
        const inventoryData: any = {
          id: `inv-${product.id}-${now.getTime()}`,
          productId: product.id, 
          quantity: randomStock, 
          tenantId: product.tenantId,
          updatedAt: now,
        };
        
        if (product.branchId) {
          inventoryData.branchId = product.branchId;
        }
        
        await prisma.inventory.create({
          data: inventoryData,
        });
      }
      console.log(`Set stock for ${product.name} to ${randomStock}`);
    }
    await prisma.$disconnect();
  }

main();
