const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Update Basic plan
    await prisma.plan.updateMany({
      where: { name: 'Basic' },
      data: { stripePriceId: 'price_1RxCYlCXIhVW50LeyY4DMAIu' },
    });

  // Update Pro plan
    await prisma.plan.updateMany({
      where: { name: 'Pro' },
      data: { stripePriceId: 'price_1RxCZNCXIhVW50Le2KlkYQIY' },
    });

  // Update Premium plan
    await prisma.plan.updateMany({
      where: { name: 'Premium' },
      data: { stripePriceId: 'price_1RxCZvCXIhVW50LeIZO9GzaE' },
    });

  console.log('Stripe price IDs updated for all plans.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
