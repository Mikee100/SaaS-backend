import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createSuperadmin() {
  try {
    // Check if superadmin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@gmail.com' },
    });

    if (existingAdmin) {
      console.log('Superadmin user already exists.');
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('admin', 10);

    // Create the superadmin user
    const superadmin = await prisma.user.create({
      data: {
        email: 'admin@gmail.com',
        password: hashedPassword,
        name: 'Super Admin',
        isSuperadmin: true,
        // tenantId is optional for superadmin
      },
    });

    console.log('Superadmin user created successfully:', superadmin.email);
  } catch (error) {
    console.error('Error creating superadmin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

export default createSuperadmin;

// If running directly
if (require.main === module) {
  createSuperadmin();
}