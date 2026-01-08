import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createSuperadmin() {
  try {
    // Check if superadmin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'superadmin@gmail.com' },
    });

    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    if (existingAdmin) {
      // Update password if user exists
      await prisma.user.update({
        where: { email: 'superadmin@gmail.com' },
        data: { password: hashedPassword },
      });
      console.log('Superadmin password has been reset.');
      return;
    }

    // Create the superadmin user
    const superadmin = await prisma.user.create({
      data: {
        email: 'superadmin@gmail.com',
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