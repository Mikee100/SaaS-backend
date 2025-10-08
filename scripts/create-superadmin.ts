import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface CreateSuperAdminData {
  name: string;
  email: string;
  password: string;
}

async function createSuperAdmin(data: CreateSuperAdminData) {
  try {
    console.log('🚀 Creating superadmin user...');

    // Hash the password
    const hashedPassword = await bcrypt.hash(data.password, 10);
    console.log('✅ Password hashed successfully');

    // Check if superadmin already exists
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { isSuperadmin: true }
    });

    if (existingSuperAdmin) {
      console.log('⚠️  Superadmin user already exists:', existingSuperAdmin.email);
      // Check if they have admin role
      const adminRoleExists = await prisma.userRole.findFirst({
        where: {
          userId: existingSuperAdmin.id,
          role: { name: 'admin' }
        }
      });

      if (adminRoleExists) {
        console.log('✅ Superadmin already has admin role');
        return existingSuperAdmin;
      } else {
        console.log('🔧 Assigning admin role to existing superadmin...');
        // Ensure tenantId is not null
        if (!existingSuperAdmin.tenantId) {
          throw new Error('Superadmin user must have a tenantId');
        }

        // Create or find the admin role
        let adminRole = await prisma.role.findFirst({
          where: {
            name: 'admin',
            tenantId: existingSuperAdmin.tenantId
          }
        });

        if (!adminRole) {
          adminRole = await prisma.role.create({
            data: {
              name: 'admin',
              description: 'Superadmin with full system access',
              tenantId: existingSuperAdmin.tenantId,
            },
          });
          console.log(`✅ Admin role created`);
        }

        // Assign admin role to the existing superadmin user
        await prisma.userRole.create({
          data: {
            userId: existingSuperAdmin.id,
            roleId: adminRole.id,
            tenantId: existingSuperAdmin.tenantId,
          },
        });
        console.log(`✅ Admin role assigned to existing superadmin user`);

        // Assign all permissions to the admin role
        const allPermissions = await prisma.permission.findMany();
        console.log(`Found ${allPermissions.length} permissions to assign`);

        for (const permission of allPermissions) {
          const existingRolePermission = await prisma.rolePermission.findFirst({
            where: {
              roleId: adminRole.id,
              permissionId: permission.id,
            }
          });

          if (!existingRolePermission) {
            await prisma.rolePermission.create({
              data: {
                roleId: adminRole.id,
                permissionId: permission.id,
              },
            });
          }
        }
        console.log(`✅ All permissions assigned to admin role`);

        return existingSuperAdmin;
      }
    }

    // Create a dummy tenant for the superadmin
    const dummyTenant = await prisma.tenant.create({
      data: {
        name: 'System Administration',
        businessType: 'Technology',
        contactEmail: data.email,
        contactPhone: '+0000000000',
      },
    });
    console.log(`✅ Dummy tenant created with ID: ${dummyTenant.id}`);

    // Create the superadmin user
    const superAdmin = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        isSuperadmin: true,
        tenantId: dummyTenant.id,
      },
    });
    console.log(`✅ Superadmin user created with ID: ${superAdmin.id}`);

    // Create or find the admin role
    let adminRole = await prisma.role.findFirst({
      where: {
        name: 'admin',
        tenantId: dummyTenant.id
      }
    });

    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          name: 'admin',
          description: 'Superadmin with full system access',
          tenantId: dummyTenant.id,
        },
      });
      console.log(`✅ Admin role created`);
    }

    // Assign admin role to the superadmin user
    await prisma.userRole.create({
      data: {
        userId: superAdmin.id,
        roleId: adminRole.id,
        tenantId: dummyTenant.id,
      },
    });
    console.log(`✅ Admin role assigned to superadmin user`);

    // Assign all permissions to the admin role
    const allPermissions = await prisma.permission.findMany();
    console.log(`Found ${allPermissions.length} permissions to assign`);

    for (const permission of allPermissions) {
      const existingRolePermission = await prisma.rolePermission.findFirst({
        where: {
          roleId: adminRole.id,
          permissionId: permission.id,
        }
      });

      if (!existingRolePermission) {
        await prisma.rolePermission.create({
          data: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        });
      }
    }
    console.log(`✅ All permissions assigned to admin role`);

    console.log('\n🎉 Superadmin user creation completed successfully!');
    console.log('📋 Summary:');
    console.log(`   Name: ${superAdmin.name}`);
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   User ID: ${superAdmin.id}`);
    console.log('\n🔐 Login Credentials:');
    console.log(`   Email: ${data.email}`);
    console.log(`   Password: ${data.password}`);

    return superAdmin;

  } catch (error) {
    console.error('❌ Error creating superadmin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Superadmin data
const superAdminData: CreateSuperAdminData = {
  name: 'System Administrator',
  email: 'superadmin@gmail.com',
  password: 'admin'
};

// Run the script
console.log('👑 Creating superadmin user...\n');

createSuperAdmin(superAdminData)
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
