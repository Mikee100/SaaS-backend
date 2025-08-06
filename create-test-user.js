const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Create a test tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Test Business',
        businessType: 'Retail',
        contactEmail: 'test@example.com',
        contactPhone: '+1234567890',
        address: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        country: 'Test Country',
        postalCode: '12345',
        currency: 'USD',
        timezone: 'America/New_York',
      },
    });

    // Create owner role if it doesn't exist
    const ownerRole = await prisma.role.upsert({
      where: { name: 'owner' },
      update: {},
      create: {
        name: 'owner',
        description: 'Business owner with full access',
      },
    });

    // Create test user
    const hashedPassword = await bcrypt.hash('test123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        isSuperadmin: false,
      },
    });

    // Assign user to tenant with owner role
    await prisma.userRole.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        roleId: ownerRole.id,
      },
    });

    console.log('✅ Test user created successfully!');
    console.log('📧 Email: test@example.com');
    console.log('🔑 Password: test123');
    console.log('🏢 Tenant ID:', tenant.id);
    console.log('👤 User ID:', user.id);

  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser(); 