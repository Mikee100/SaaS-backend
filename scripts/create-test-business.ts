import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface CreateBusinessData {
  businessName: string;
  businessCategory: string;
  businessSubcategory: string;
  businessType: string;
  businessDescription: string;
  contactEmail: string;
  contactPhone: string;
  website?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  foundedYear: number;
  employeeCount: string;
  annualRevenue: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
}

async function createTestBusiness(data: CreateBusinessData) {
  try {
    console.log('🚀 Starting business creation process...');

    // Hash the password
    const hashedPassword = await bcrypt.hash(data.ownerPassword, 10);
    console.log('✅ Password hashed successfully');

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create the tenant (business)
      const tenant = await tx.tenant.create({
        data: {
          name: data.businessName,
          businessCategory: data.businessCategory,
          businessSubcategory: data.businessSubcategory,
          businessType: data.businessType,
          businessDescription: data.businessDescription,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          website: data.website,
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country,
          postalCode: data.postalCode,
          foundedYear: data.foundedYear,
          employeeCount: data.employeeCount,
          annualRevenue: data.annualRevenue,
        },
      });
      console.log(`✅ Tenant created with ID: ${tenant.id}`);

      // Create the owner user
      const user = await tx.user.create({
        data: {
          name: data.ownerName,
          email: data.ownerEmail,
          password: hashedPassword,
          isSuperadmin: false,
          tenantId: tenant.id,
        },
      });
      console.log(`✅ User created with ID: ${user.id}`);

      // Create or find the owner role
      let ownerRole = await tx.role.findFirst({
        where: {
          name: 'owner',
          tenantId: tenant.id
        }
      });

      if (!ownerRole) {
        ownerRole = await tx.role.create({
          data: {
            name: 'owner',
            description: 'Tenant owner with full access',
            tenantId: tenant.id,
          },
        });
        console.log(`✅ Owner role created for tenant ${tenant.id}`);
      }

      // Assign owner role to the user
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: ownerRole.id,
          tenantId: tenant.id,
        },
      });
      console.log(`✅ Owner role assigned to user ${user.id}`);

      // Create default permissions for the owner role
      const defaultPermissions = [
        'view_products', 'create_products', 'edit_products', 'delete_products',
        'view_inventory', 'manage_inventory',
        'view_sales', 'create_sales', 'edit_sales', 'delete_sales',
        'view_users', 'create_users', 'edit_users', 'delete_users',
        'view_reports', 'view_analytics',
        'manage_settings', 'manage_billing'
      ];

      for (const permissionName of defaultPermissions) {
        let permission = await tx.permission.findFirst({
          where: { name: permissionName }
        });

        if (!permission) {
          permission = await tx.permission.create({
            data: { name: permissionName }
          });
        }

        // Assign permission to role
        await tx.rolePermission.create({
          data: {
            roleId: ownerRole.id,
            permissionId: permission.id,
          },
        });
      }
      console.log(`✅ Default permissions assigned to owner role`);

      return { tenant, user, ownerRole };
    });

    console.log('\n🎉 Business creation completed successfully!');
    console.log('📋 Summary:');
    console.log(`   Business: ${result.tenant.name}`);
    console.log(`   Owner: ${result.user.name} (${result.user.email})`);
    console.log(`   Tenant ID: ${result.tenant.id}`);
    console.log(`   User ID: ${result.user.id}`);
    console.log('\n🔐 Login Credentials:');
    console.log(`   Email: ${data.ownerEmail}`);
    console.log(`   Password: ${data.ownerPassword}`);

    return result;

  } catch (error) {
    console.error('❌ Error creating business:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Test data - you can modify these values
const testBusinessData: CreateBusinessData = {
  businessName: 'My Test Business',
  businessCategory: 'Technology',
  businessSubcategory: 'Software Development',
  businessType: 'LLC',
  businessDescription: 'A test business for development and testing purposes',
  contactEmail: 'test@example.com',
  contactPhone: '+254700000000',
  website: 'https://example.com',
  address: '123 Test Street',
  city: 'Nairobi',
  state: 'Nairobi',
  country: 'Kenya',
  postalCode: '00100',
  foundedYear: 2024,
  employeeCount: '1-10',
  annualRevenue: '< 1M KES',
  ownerName: 'Test Owner',
  ownerEmail: 'test@example.com',
  ownerPassword: 'test123456'
};

// Run the script
console.log('🏢 Creating test business...\n');

createTestBusiness(testBusinessData)
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
