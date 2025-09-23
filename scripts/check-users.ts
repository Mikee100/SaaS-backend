import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking database connection...');
    await prisma.$connect();
    console.log('Database connection successful!\n');

    // List all users
    console.log('Listing all users:');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isSuperadmin: true,
        tenantId: true,
        branchId: true,
        userRoles: {
          include: {
            role: true,
            tenant: true
          }
        }
      }
    });

    console.log(`Found ${users.length} users:`);
    console.log(JSON.stringify(users, null, 2));

    // Check if there are any users with admin role
    const adminUsers = users.filter(user => 
      user.userRoles.some(ur => ur.role.name.toLowerCase() === 'admin')
    );

    console.log(`\nFound ${adminUsers.length} admin users:`);
    console.log(JSON.stringify(adminUsers, null, 2));

    if (adminUsers.length === 0) {
      console.log('\nNo admin users found. You may want to create an admin user.');
    }

  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
