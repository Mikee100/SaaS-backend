const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSubscription() {
  try {
    console.log('Testing subscription creation...');
    
    // Check if plans exist
    const plans = await prisma.plan.findMany();
    console.log('Available plans:', plans.map(p => ({ id: p.id, name: p.name, price: p.price })));
    
    // Check if any tenants exist
    const tenants = await prisma.tenant.findMany({ take: 1 });
    console.log('Available tenants:', tenants.length);
    
    if (tenants.length > 0) {
      const tenantId = tenants[0].id;
      console.log('Using tenant:', tenantId);
      
      // Check current subscription
      const currentSubscription = await prisma.subscription.findFirst({
        where: { tenantId },
        include: { plan: true }
      });
      
      console.log('Current subscription:', currentSubscription ? {
        id: currentSubscription.id,
        plan: currentSubscription.plan.name,
        status: currentSubscription.status
      } : 'None');
      
      // Try to create a subscription
      if (!currentSubscription) {
        const newSubscription = await prisma.subscription.create({
          data: {
            tenantId,
            planId: 'basic-plan',
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          },
          include: { plan: true }
        });
        
        console.log('Created subscription:', {
          id: newSubscription.id,
          plan: newSubscription.plan.name,
          status: newSubscription.status
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSubscription(); 